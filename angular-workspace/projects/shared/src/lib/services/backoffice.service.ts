import { Injectable, inject } from '@angular/core';
import {
  BackofficeClientDetail,
  BackofficeClientMessage,
  BackofficeClientProfile,
  BackofficeClientRecharge,
  BackofficeProfileAuditLog,
  UpdateClientBasicInfoPayload
} from '../models/user.model';
import { SupabaseService } from './supabase.service';

export interface InventoryState {
  available_sms: number;
  sold_sms: number;
  total_sms: number;
  updated_at: string | null;
  source?: 'local_inventory' | 'unavailable';
}

export interface InventoryPurchaseRecord {
  id: string;
  quantity: number;
  amount: number;
  cost_per_sms: number;
  operation_number: string | null;
  notes: string | null;
  created_at: string;
  purchased_by: string | null;
  admin: {
    full_name: string;
    email: string;
  } | null;
}

export interface AddInventoryPurchaseRequest {
  quantity: number;
  amount: number;
  operation_number?: string | null;
  notes?: string | null;
}

export interface ProviderBalanceSyncResult {
  external_balance: number | null;
  provider: string;
}

export interface BackofficeClientCardStats {
  approvedRecharges: number;
  totalSpent: number;
}

export interface BackofficeDashboardStats {
  users: {
    total_users: number;
    active_users: number;
    total_sms_balance: number;
  };
  recharges: {
    pending_recharges: number;
    approved_sms_sold: number;
    total_revenue: number;
  };
  inventory: {
    available_sms: number;
    sold_sms: number;
    total_sms: number;
  };
  messages: {
    total_messages: number;
    sent_messages: number;
    delivered_messages: number;
    failed_messages: number;
    pending_messages: number;
  };
}

const INTERNAL_ALERTS_EMAIL = 'alerts@smsfortuna.internal';
const REVENUE_RECHARGE_STATUS = 'approved';
const SENT_OR_ACCEPTED_MESSAGE_STATUSES = new Set(['sent', 'accepted']);
const INVENTORY_QUERY_PAGE_SIZE = 1000;

@Injectable({ providedIn: 'root' })
export class BackofficeService {
  private readonly supabase = inject(SupabaseService);

  async getDashboardStats(): Promise<BackofficeDashboardStats> {
    const [
      profilesResult,
      internalAccountsResult,
      adminsResult,
      rechargesResult,
      messagesResult
    ] = await Promise.all([
      this.supabase.instance
        .from('profiles')
        .select('id,email,is_active,credits'),
      this.supabase.instance
        .from('internal_accounts')
        .select('profile_id,is_active'),
      this.supabase.instance
        .from('admins')
        .select('id'),
      this.supabase.instance
        .from('recharges')
        .select('user_id,status,amount,sms_credits'),
      this.supabase.instance
        .from('sms_messages')
        .select('status')
    ]);

    if (profilesResult.error) {
      throw new Error(`No se pudieron cargar los perfiles: ${profilesResult.error.message}`);
    }

    if (internalAccountsResult.error) {
      throw new Error(`No se pudieron cargar las cuentas internas: ${internalAccountsResult.error.message}`);
    }

    if (adminsResult.error) {
      throw new Error(`No se pudieron validar administradores: ${adminsResult.error.message}`);
    }

    if (rechargesResult.error) {
      throw new Error(`No se pudieron cargar las recargas: ${rechargesResult.error.message}`);
    }

    if (messagesResult.error) {
      throw new Error(`No se pudieron cargar los mensajes: ${messagesResult.error.message}`);
    }

    const internalProfileIds = new Set(
      ((internalAccountsResult.data as unknown[]) ?? [])
        .map((account) => this.toSafeString((account as Record<string, unknown>)['profile_id']))
        .filter(Boolean)
    );
    const adminIds = new Set(
      ((adminsResult.data as unknown[]) ?? [])
        .map((admin) => this.toSafeString((admin as Record<string, unknown>)['id']))
        .filter(Boolean)
    );
    const profiles = ((profilesResult.data as unknown[]) ?? [])
      .map((profile) => profile as Record<string, unknown>)
      .filter((profile) => this.isCommercialProfile(profile, internalProfileIds, adminIds));
    const commercialProfileIds = new Set(
      profiles.map((profile) => this.toSafeString(profile['id'])).filter(Boolean)
    );
    const revenueRecharges = ((rechargesResult.data as unknown[]) ?? [])
      .map((recharge) => recharge as Record<string, unknown>)
      .filter((recharge) => {
        const userId = this.toSafeString(recharge['user_id']);
        const status = this.toSafeString(recharge['status']).toLowerCase();

        return commercialProfileIds.has(userId) && status === REVENUE_RECHARGE_STATUS;
      });
    const pendingRecharges = ((rechargesResult.data as unknown[]) ?? [])
      .filter((recharge) => this.toSafeString((recharge as Record<string, unknown>)['status']).toLowerCase() === 'pending')
      .length;
    const messages = ((messagesResult.data as unknown[]) ?? [])
      .map((message) => this.toSafeString((message as Record<string, unknown>)['status']).toLowerCase());
    const inventory = await this.getInventoryState();

    return {
      users: {
        total_users: profiles.length,
        active_users: profiles.filter((profile) => profile['is_active'] === true).length,
        total_sms_balance: profiles.reduce((sum, profile) => sum + Number(profile['credits'] ?? 0), 0)
      },
      recharges: {
        pending_recharges: pendingRecharges,
        approved_sms_sold: revenueRecharges.reduce((sum, recharge) => sum + Number(recharge['sms_credits'] ?? 0), 0),
        total_revenue: revenueRecharges.reduce((sum, recharge) => sum + Number(recharge['amount'] ?? 0), 0)
      },
      inventory: {
        available_sms: inventory.available_sms,
        sold_sms: inventory.sold_sms,
        total_sms: inventory.total_sms
      },
      messages: {
        total_messages: messages.length,
        sent_messages: messages.filter((status) => SENT_OR_ACCEPTED_MESSAGE_STATUSES.has(status)).length,
        delivered_messages: messages.filter((status) => status === 'delivered').length,
        failed_messages: messages.filter((status) => status === 'failed').length,
        pending_messages: messages.filter((status) => status === 'pending').length
      }
    };
  }

  async getInventoryState(): Promise<InventoryState> {
    try {
      const [purchases, recharges] = await Promise.all([
        this.listAllRows('inventory_purchases', 'quantity,created_at'),
        this.listAllRows('recharges', 'status,sms_credits')
      ]);

      if (!purchases || !recharges) {
        return this.emptyInventoryState();
      }

      const totalSms = purchases.reduce((sum, purchase) => sum + this.toFiniteNumber(purchase['quantity']), 0);
      const soldSms = recharges
        .filter((recharge) => this.toSafeString(recharge['status']).toLowerCase() === REVENUE_RECHARGE_STATUS)
        .reduce((sum, recharge) => sum + this.toFiniteNumber(recharge['sms_credits']), 0);
      const latestPurchaseAt = purchases
        .map((purchase) => this.toSafeString(purchase['created_at']))
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;

      return this.localInventoryState(totalSms, soldSms, latestPurchaseAt);
    } catch (error) {
      console.warn('No se pudo calcular inventario local de compras SMS.', error);
      return this.emptyInventoryState();
    }
  }

  async listInventoryPurchases(): Promise<InventoryPurchaseRecord[]> {
    const { data, error } = await this.supabase.instance
      .from('inventory_purchases')
      .select(`
        id,
        quantity,
        amount,
        cost_per_sms,
        operation_number,
        notes,
        created_at,
        purchased_by,
        admin:admins(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudieron cargar las compras de inventario: ${error.message}`);
    }

    return ((data as any[] | null) ?? []).map((purchase) => ({
      id: String(purchase.id ?? ''),
      quantity: Number(purchase.quantity ?? 0),
      amount: Number(purchase.amount ?? 0),
      cost_per_sms: Number(purchase.cost_per_sms ?? 0),
      operation_number: this.toNullableString(purchase.operation_number),
      notes: this.toNullableString(purchase.notes),
      created_at: this.toSafeString(purchase.created_at) || new Date().toISOString(),
      purchased_by: this.toNullableString(purchase.purchased_by),
      admin: purchase.admin
        ? {
            full_name: this.toSafeString(purchase.admin.full_name),
            email: this.toSafeString(purchase.admin.email)
          }
        : null
    }));
  }

  async addSmsInventory(request: AddInventoryPurchaseRequest): Promise<void> {
    const { error } = await this.supabase.instance.rpc('admin_add_sms_inventory', {
      p_quantity: request.quantity,
      p_amount: request.amount,
      p_operation_number: request.operation_number?.trim() || null,
      p_notes: request.notes?.trim() || null
    });

    if (error) {
      throw new Error(this.toFriendlyError(error.message));
    }
  }

  async syncProviderBalance(): Promise<ProviderBalanceSyncResult> {
    const { data, error } = await this.supabase.instance.functions.invoke<ProviderBalanceSyncResult & { success?: boolean; error?: string }>('admin-sync-provider-balance', {
      body: {}
    });

    if (error) {
      throw new Error(`No se pudo consultar saldo proveedor: ${error.message}`);
    }

    if (!data?.success && (data as { success?: boolean } | null)?.success === false) {
      throw new Error(data?.error || 'No se pudo consultar saldo proveedor.');
    }

    return {
      external_balance: Number.isFinite(Number(data?.external_balance)) ? Number(data?.external_balance) : null,
      provider: this.toSafeString(data?.provider) || 'proveedor'
    };
  }

  async listClients(): Promise<BackofficeClientProfile[]> {
    const [profilesResult, adminsResult] = await Promise.all([
      this.supabase.instance
        .from('profiles')
        .select('id,email,full_name,razon_social,ruc,phone,credits,total_spent,is_active,created_at,updated_at')
        .order('created_at', { ascending: false }),
      this.supabase.instance
        .from('admins')
        .select('id')
    ]);

    if (profilesResult.error) {
      throw new Error(`No se pudieron cargar los clientes: ${profilesResult.error.message}`);
    }

    if (adminsResult.error) {
      throw new Error(`No se pudieron validar administradores: ${adminsResult.error.message}`);
    }

    const adminIds = new Set(((adminsResult.data as unknown[]) ?? [])
      .map((admin) => String((admin as Record<string, unknown>)['id'] ?? ''))
      .filter(Boolean));

    return ((profilesResult.data as unknown[]) ?? [])
      .map((profile) => this.mapClientProfile(profile))
      .filter((profile) => profile.id && !adminIds.has(profile.id));
  }

  async getClientCardStats(profileIds: string[]): Promise<Map<string, BackofficeClientCardStats>> {
    const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));
    const stats = new Map<string, BackofficeClientCardStats>(
      uniqueIds.map((id) => [id, { approvedRecharges: 0, totalSpent: 0 }])
    );

    if (!uniqueIds.length) {
      return stats;
    }

    const { data, error } = await this.supabase.instance
      .from('recharges')
      .select('user_id,amount,status')
      .in('user_id', uniqueIds);

    if (error) {
      throw new Error(`No se pudieron cargar las métricas de cuentas: ${error.message}`);
    }

    for (const recharge of (data as unknown[]) ?? []) {
      const row = recharge as Record<string, unknown>;
      const userId = this.toSafeString(row['user_id']);
      const current = stats.get(userId);

      if (!current || row['status'] !== 'approved') {
        continue;
      }

      current.approvedRecharges += 1;
      current.totalSpent += Number(row['amount'] ?? 0);
    }

    return stats;
  }

  async getClientDetail(profileId: string): Promise<BackofficeClientDetail> {
    const [profile, recentRecharges, recentMessages, allRecharges, allMessages, auditLogs] = await Promise.all([
      this.getClientProfile(profileId),
      this.listClientRecharges(profileId, 5),
      this.listClientMessages(profileId, 5),
      this.listClientRecharges(profileId),
      this.listClientMessages(profileId),
      this.listClientAuditLogs(profileId, 5).catch(() => [])
    ]);

    return {
      profile,
      recentRecharges,
      recentMessages,
      auditLogs,
      counts: {
        pendingRecharges: allRecharges.filter((recharge) => recharge.status === 'pending').length,
        approvedRecharges: allRecharges.filter((recharge) => recharge.status === 'approved').length,
        sentMessages: allMessages.filter((message) => message.status === 'sent' || message.status === 'delivered').length,
        failedMessages: allMessages.filter((message) => message.status === 'failed').length
      }
    };
  }

  async updateClientBasicInfo(profileId: string, payload: UpdateClientBasicInfoPayload): Promise<void> {
    const actorUserId = await this.getCurrentUserId();
    const { error } = await this.supabase.instance.rpc('admin_update_profile_company_ruc', {
      p_actor_user_id: actorUserId,
      p_profile_id: profileId,
      p_full_name: payload.full_name,
      p_razon_social: payload.razon_social,
      p_ruc: payload.ruc,
      p_phone: this.normalizePhone(payload.phone),
      p_is_active: payload.is_active
    });

    if (error) {
      throw new Error(this.toClientProfileRpcError(error.message, 'No se pudo actualizar el cliente.'));
    }
  }

  async setClientActive(profileId: string, isActive: boolean): Promise<void> {
    const { error } = await this.supabase.instance.rpc('admin_set_client_active', {
      p_profile_id: profileId,
      p_is_active: isActive
    });

    if (error) {
      throw new Error(this.toClientProfileRpcError(error.message, 'No se pudo cambiar el estado del cliente.'));
    }
  }

  async listClientRecharges(profileId: string, limit?: number): Promise<BackofficeClientRecharge[]> {
    let query = this.supabase.instance
      .from('recharges')
      .select('id,sms_credits,amount,payment_method,operation_code,status,created_at')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`No se pudieron cargar las recargas del cliente: ${error.message}`);
    }

    return ((data as unknown[]) ?? []).map((recharge) => this.mapClientRecharge(recharge));
  }

  async listClientMessages(profileId: string, limit?: number): Promise<BackofficeClientMessage[]> {
    let query = this.supabase.instance
      .from('sms_messages')
      .select('id,recipient,message,segments,cost,status,created_at,sent_at,error_message')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`No se pudieron cargar los mensajes del cliente: ${error.message}`);
    }

    return ((data as unknown[]) ?? []).map((message) => this.mapClientMessage(message));
  }

  async listClientAuditLogs(profileId: string, limit = 5): Promise<BackofficeProfileAuditLog[]> {
    const { data, error } = await this.supabase.instance
      .from('profile_audit_logs')
      .select(`
        id,
        profile_id,
        changed_by,
        action,
        old_data,
        new_data,
        created_at,
        admin:admins (
          full_name,
          email
        )
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`No se pudo cargar la auditoría del cliente: ${error.message}`);
    }

    return ((data as unknown[]) ?? []).map((log) => this.mapProfileAuditLog(log));
  }

  async syncUsers(): Promise<void> {
    // TODO: trigger users synchronization.
  }

  async syncPackages(): Promise<void> {
    // TODO: trigger packages synchronization.
  }

  async sendLowBalanceAlerts(): Promise<void> {
    // TODO: trigger low balance alerts.
  }

  private toFriendlyError(message: string): string {
    if (message.includes('NOT_AUTHORIZED')) {
      return 'No tienes permisos de administrador.';
    }

    return message;
  }

  private toClientProfileRpcError(message: string, fallback: string): string {
    if (message.includes('NOT_AUTHORIZED')) {
      return `${fallback} No tienes permisos de administrador.`;
    }

    if (message.includes('PROFILE_NOT_FOUND')) {
      return `${fallback} Perfil no encontrado.`;
    }

    if (message.includes('PROFILE_COMPANY_REQUIRED')) {
      return `${fallback} El cliente no tiene empresa/RUC vinculada. Requiere revisión manual.`;
    }

    if (message.includes('COMPANY_NOT_FOUND')) {
      return `${fallback} La empresa vinculada no existe. Requiere revisión manual.`;
    }

    if (message.includes('COMPANY_HAS_MULTIPLE_ACTIVE_USERS_REQUIRES_MANUAL_REVIEW')) {
      return `${fallback} La empresa tiene más de un usuario activo. Cambiar RUC requiere revisión manual.`;
    }

    if (message.includes('RUC_ALREADY_ASSIGNED_TO_OTHER_COMPANY_REQUIRES_MANUAL_MERGE')) {
      return `${fallback} El RUC ya pertenece a otra empresa. Requiere merge manual.`;
    }

    if (message.includes('CANNOT_UPDATE_ADMIN_PROFILE')) {
      return `${fallback} No se puede editar un perfil administrador desde clientes.`;
    }

    if (message.includes('INVALID_RUC')) {
      return 'El RUC debe tener 11 dígitos.';
    }

    if (message.includes('INVALID_PHONE')) {
      return 'El teléfono debe tener formato peruano +51XXXXXXXXX o quedar vacío.';
    }

    return `${fallback} ${message}`;
  }

  private async getCurrentUserId(): Promise<string> {
    const { data, error } = await this.supabase.instance.auth.getUser();

    if (error || !data.user?.id) {
      throw new Error('No se pudo validar la sesión admin.');
    }

    return data.user.id;
  }

  private isCommercialProfile(
    profile: Record<string, unknown>,
    internalProfileIds: Set<string>,
    adminIds: Set<string>
  ): boolean {
    const id = this.toSafeString(profile['id']);
    const email = this.toSafeString(profile['email']).trim().toLowerCase();

    return Boolean(id) &&
      !internalProfileIds.has(id) &&
      !adminIds.has(id) &&
      email !== INTERNAL_ALERTS_EMAIL;
  }

  private async getClientProfile(profileId: string): Promise<BackofficeClientProfile> {
    const { data, error } = await this.supabase.instance
      .from('profiles')
      .select('id,email,full_name,razon_social,ruc,phone,credits,total_spent,is_active,created_at,updated_at')
      .eq('id', profileId)
      .maybeSingle();

    if (error || !data) {
      throw new Error(error?.message || 'Cliente no encontrado.');
    }

    return this.mapClientProfile(data);
  }

  private mapClientProfile(value: unknown): BackofficeClientProfile {
    const profile = value as Record<string, unknown>;

    return {
      id: this.toSafeString(profile['id']),
      email: this.toSafeString(profile['email']),
      full_name: this.toNullableString(profile['full_name']),
      razon_social: this.toNullableString(profile['razon_social']),
      ruc: this.toNullableString(profile['ruc']),
      phone: this.toNullableString(profile['phone']),
      credits: Number(profile['credits'] ?? 0),
      total_spent: Number(profile['total_spent'] ?? 0),
      is_active: Boolean(profile['is_active']),
      created_at: this.toSafeString(profile['created_at']) || new Date().toISOString(),
      updated_at: this.toNullableString(profile['updated_at'])
    };
  }

  private mapClientRecharge(value: unknown): BackofficeClientRecharge {
    const recharge = value as Record<string, unknown>;

    return {
      id: this.toSafeString(recharge['id']),
      sms_credits: Number(recharge['sms_credits'] ?? 0),
      amount: Number(recharge['amount'] ?? 0),
      payment_method: this.toNullableString(recharge['payment_method']),
      operation_code: this.toNullableString(recharge['operation_code']),
      status: this.toRechargeStatus(recharge['status']),
      created_at: this.toSafeString(recharge['created_at']) || new Date().toISOString()
    };
  }

  private mapClientMessage(value: unknown): BackofficeClientMessage {
    const message = value as Record<string, unknown>;

    return {
      id: this.toSafeString(message['id']),
      recipient: this.toSafeString(message['recipient']),
      message: this.toSafeString(message['message']),
      segments: Number(message['segments'] ?? 0),
      cost: Number(message['cost'] ?? 0),
      status: this.toMessageStatus(message['status']),
      created_at: this.toSafeString(message['created_at']) || new Date().toISOString(),
      sent_at: this.toNullableString(message['sent_at']),
      error_message: this.toNullableString(message['error_message'])
    };
  }

  private mapProfileAuditLog(value: unknown): BackofficeProfileAuditLog {
    const log = value as Record<string, unknown>;
    const admin = Array.isArray(log['admin']) ? log['admin'][0] : log['admin'];

    return {
      id: this.toSafeString(log['id']),
      profile_id: this.toSafeString(log['profile_id']),
      changed_by: this.toNullableString(log['changed_by']),
      action: this.toSafeString(log['action']),
      old_data: this.toJsonObject(log['old_data']),
      new_data: this.toJsonObject(log['new_data']),
      created_at: this.toSafeString(log['created_at']) || new Date().toISOString(),
      admin: admin && typeof admin === 'object'
        ? {
            full_name: this.toNullableString((admin as Record<string, unknown>)['full_name']),
            email: this.toNullableString((admin as Record<string, unknown>)['email'])
          }
        : null
    };
  }

  private toRechargeStatus(value: unknown): BackofficeClientRecharge['status'] {
    return value === 'approved' || value === 'rejected' || value === 'pending'
      ? value
      : 'pending';
  }

  private toMessageStatus(value: unknown): BackofficeClientMessage['status'] {
    return value === 'sent' || value === 'delivered' || value === 'failed' || value === 'pending'
      ? value
      : 'pending';
  }

  private toSafeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private toJsonObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private normalizePhone(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const cleanValue = value.trim().replace(/\s+/g, '');
    return cleanValue ? cleanValue : null;
  }

  private async listAllRows(table: string, columns: string): Promise<Record<string, unknown>[] | null> {
    const rows: Record<string, unknown>[] = [];

    for (let from = 0; ; from += INVENTORY_QUERY_PAGE_SIZE) {
      const to = from + INVENTORY_QUERY_PAGE_SIZE - 1;
      const { data, error } = await this.supabase.instance
        .from(table)
        .select(columns)
        .range(from, to);

      if (error) {
        console.warn(`No se pudo leer ${table} para inventario local.`, error.message);
        return null;
      }

      const page = ((data as unknown[]) ?? [])
        .map((row) => row as Record<string, unknown>);

      rows.push(...page);

      if (page.length < INVENTORY_QUERY_PAGE_SIZE) {
        return rows;
      }
    }
  }

  private toFiniteNumber(value: unknown): number {
    const normalized = typeof value === 'string'
      ? value.replace(/,/g, '').trim()
      : value;
    const parsed = Number(normalized ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private localInventoryState(totalSms: number, soldSms: number, updatedAt: string | null): InventoryState {
    const safeTotal = Math.max(0, Math.floor(Number.isFinite(totalSms) ? totalSms : 0));
    const safeSold = Math.max(0, Math.floor(Number.isFinite(soldSms) ? soldSms : 0));

    return {
      available_sms: Math.max(safeTotal - safeSold, 0),
      sold_sms: safeSold,
      total_sms: safeTotal,
      updated_at: updatedAt,
      source: 'local_inventory'
    };
  }

  private emptyInventoryState(): InventoryState {
    return {
      available_sms: 0,
      sold_sms: 0,
      total_sms: 0,
      updated_at: null,
      source: 'unavailable'
    };
  }
}

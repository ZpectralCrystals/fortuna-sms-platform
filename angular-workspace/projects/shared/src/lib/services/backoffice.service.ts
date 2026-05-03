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

@Injectable({ providedIn: 'root' })
export class BackofficeService {
  private readonly supabase = inject(SupabaseService);

  async getDashboardStats(): Promise<unknown> {
    const { data, error } = await this.supabase.instance.rpc('get_dashboard_stats');

    if (error) {
      throw new Error(this.toFriendlyError(error.message));
    }

    return data;
  }

  async getInventoryState(): Promise<InventoryState> {
    const { data, error } = await this.supabase.instance
      .from('sms_inventory')
      .select('available_sms,sold_sms,total_sms,updated_at')
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo cargar el inventario: ${error.message}`);
    }

    return {
      available_sms: Number(data?.available_sms ?? 0),
      sold_sms: Number(data?.sold_sms ?? 0),
      total_sms: Number(data?.total_sms ?? 0),
      updated_at: typeof data?.updated_at === 'string' ? data.updated_at : null
    };
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
    const { error } = await this.supabase.instance.rpc('admin_update_client_profile', {
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
}

import { Injectable, inject } from '@angular/core';
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

  private toSafeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}

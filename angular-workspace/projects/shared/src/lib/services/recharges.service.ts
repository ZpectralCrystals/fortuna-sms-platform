import { Injectable, inject } from '@angular/core';
import {
  AdminRecharge,
  CreateRechargeRequest,
  Recharge,
  RechargeStatus,
  SmsPackage
} from '../models/recharge.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class RechargesService {
  private readonly supabase = inject(SupabaseService);

  async listActivePackages(): Promise<SmsPackage[]> {
    const { data, error } = await this.supabase.instance
      .from('sms_packages')
      .select('*')
      .eq('is_active', true)
      .order('sms_credits');

    if (error) {
      throw new Error(`No se pudieron cargar los paquetes activos: ${error.message}`);
    }

    return ((data as any[] | null) ?? []).map((pkg) => this.mapPackage(pkg));
  }

  async listMyRecharges(): Promise<Recharge[]> {
    const userId = await this.getCurrentUserId();

    if (!userId) {
      throw new Error('No hay sesión activa para listar recargas.');
    }

    const { data, error } = await this.supabase.instance
      .from('recharges')
      .select(`
        id,
        user_id,
        package_id,
        sms_credits,
        amount,
        payment_method,
        operation_code,
        status,
        created_at,
        approved_at,
        rejected_at,
        rejection_reason,
        package:sms_packages(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudo cargar tu historial de recargas: ${error.message}`);
    }

    return ((data as any[] | null) ?? []).map((recharge) => this.mapRecharge(recharge));
  }

  async createRecharge(request: CreateRechargeRequest): Promise<Recharge> {
    const userId = await this.getCurrentUserId();

    if (!userId) {
      throw new Error('No hay sesión activa para crear la solicitud.');
    }

    const payload = {
      user_id: userId,
      package_id: request.package_id,
      sms_credits: request.sms_credits,
      amount: request.amount,
      payment_method: request.payment_method,
      operation_code: request.operation_code?.trim() || null,
      status: 'pending'
    };

    const { data, error } = await this.supabase.instance
      .from('recharges')
      .insert(payload)
      .select(`
        id,
        user_id,
        package_id,
        sms_credits,
        amount,
        payment_method,
        operation_code,
        status,
        created_at,
        approved_at,
        rejected_at,
        rejection_reason,
        package:sms_packages(*)
      `)
      .single();

    if (error) {
      throw new Error(`No se pudo crear la solicitud de recarga: ${error.message}`);
    }

    return this.mapRecharge(data);
  }

  async listAdminRecharges(): Promise<AdminRecharge[]> {
    const { data, error } = await this.supabase.instance
      .from('recharges')
      .select(`
        id,
        user_id,
        package_id,
        sms_credits,
        amount,
        payment_method,
        operation_code,
        status,
        created_at,
        approved_at,
        rejected_at,
        rejection_reason,
        profile:profiles(full_name, email, razon_social, ruc),
        package:sms_packages(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudieron cargar las recargas: ${error.message}`);
    }

    return ((data as any[] | null) ?? []).map((recharge) => ({
      ...this.mapRecharge(recharge),
      profile: recharge.profile
        ? {
            full_name: this.toSafeString(recharge.profile.full_name),
            email: this.toSafeString(recharge.profile.email),
            razon_social: this.toNullableString(recharge.profile.razon_social),
            ruc: this.toNullableString(recharge.profile.ruc)
          }
        : null
    }));
  }

  async approveRecharge(rechargeId: string, operationCode: string): Promise<void> {
    const { error } = await this.supabase.instance.rpc('admin_approve_recharge', {
      p_recharge_id: rechargeId,
      p_operation_code: operationCode.trim()
    });

    if (error) {
      throw new Error(this.toFriendlyRpcError(error.message));
    }
  }

  async rejectRecharge(rechargeId: string, rejectionReason: string): Promise<void> {
    const { error } = await this.supabase.instance.rpc('admin_reject_recharge', {
      p_recharge_id: rechargeId,
      p_rejection_reason: rejectionReason.trim()
    });

    if (error) {
      throw new Error(this.toFriendlyRpcError(error.message));
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    const { data, error } = await this.supabase.instance.auth.getSession();

    if (error) {
      throw new Error(`No se pudo validar la sesión: ${error.message}`);
    }

    return data.session?.user?.id ?? null;
  }

  private mapRecharge(recharge: any): Recharge {
    return {
      id: String(recharge?.id ?? ''),
      user_id: String(recharge?.user_id ?? ''),
      package_id: this.toNullableString(recharge?.package_id),
      sms_credits: Number(recharge?.sms_credits ?? 0),
      amount: Number(recharge?.amount ?? 0),
      payment_method: this.toNullableString(recharge?.payment_method),
      operation_code: this.toNullableString(recharge?.operation_code),
      status: this.toStatus(recharge?.status),
      created_at: this.toSafeString(recharge?.created_at) || new Date().toISOString(),
      approved_at: this.toNullableString(recharge?.approved_at),
      rejected_at: this.toNullableString(recharge?.rejected_at),
      rejection_reason: this.toNullableString(recharge?.rejection_reason),
      package: recharge?.package ? this.mapPackage(recharge.package) : null
    };
  }

  private mapPackage(pkg: any): SmsPackage {
    const smsCredits = Number(pkg?.sms_credits ?? pkg?.quantity ?? 0);
    const totalPrice = Number(pkg?.total_price ?? 0);

    return {
      id: String(pkg?.id ?? ''),
      name: this.toSafeString(pkg?.name),
      sms_credits: smsCredits,
      base_price: Number(pkg?.base_price ?? 0),
      tax_rate: Number(pkg?.tax_rate ?? 0),
      total_price: totalPrice,
      price_per_sms: Number(pkg?.price_per_sms ?? (smsCredits > 0 ? totalPrice / smsCredits : 0)),
      is_popular: Boolean(pkg?.is_popular ?? false),
      is_active: Boolean(pkg?.is_active ?? true),
      created_at: this.toNullableString(pkg?.created_at)
    };
  }

  private toStatus(value: unknown): RechargeStatus {
    return value === 'approved' || value === 'rejected' || value === 'pending'
      ? value
      : 'pending';
  }

  private toSafeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private toFriendlyRpcError(message: string): string {
    if (message.includes('INSUFFICIENT_INVENTORY')) {
      return 'Inventario insuficiente para aprobar esta recarga.';
    }

    if (message.includes('RECHARGE_ALREADY_PROCESSED')) {
      return 'Esta recarga ya fue procesada.';
    }

    if (message.includes('NOT_AUTHORIZED')) {
      return 'No tienes permisos de administrador.';
    }

    return message;
  }
}

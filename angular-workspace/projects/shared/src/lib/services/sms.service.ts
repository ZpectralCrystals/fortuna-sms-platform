import { Injectable, inject } from '@angular/core';
import {
  AdminSmsMessage,
  AdminSmsMessageFilters,
  AdminSmsMessageProfile,
  SmsProviderResponse,
  SmsSendRequest,
  SmsSendResult
} from '../models/sms.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SmsService {
  private readonly supabase = inject(SupabaseService);

  async sendSingle(request: SmsSendRequest): Promise<SmsSendResult> {
    const recipient = request.recipient ?? request.recipients?.[0] ?? '';

    const { data, error } = await this.supabase.instance.functions.invoke<SmsSendResult>('send-sms', {
      body: {
        recipient,
        message: request.message
      }
    });

    if (error) {
      throw new Error(await this.getFunctionErrorMessage(error));
    }

    if (!data?.success) {
      throw new Error(data?.error || 'No se pudo enviar el SMS.');
    }

    return data;
  }

  async sendBulk(_request: SmsSendRequest): Promise<SmsSendResult> {
    return {
      success: false,
      error: 'Envío múltiple se implementará en siguiente fase'
    };
  }

  async listAdminMessages(filters: AdminSmsMessageFilters = {}): Promise<AdminSmsMessage[]> {
    let query = this.supabase.instance
      .from('sms_messages')
      .select(`
        id,
        user_id,
        recipient,
        message,
        segments,
        cost,
        status,
        provider_message_id,
        provider_response,
        error_message,
        sent_at,
        created_at,
        profile:profiles (
          full_name,
          email,
          razon_social,
          ruc
        )
      `)
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('No se pudieron cargar los mensajes. Verifica permisos de administrador.');
    }

    return ((data as unknown[]) ?? []).map((item) => this.mapAdminMessage(item));
  }

  async uploadCampaign(_file: File): Promise<void> {
    // TODO: implement file upload flow.
  }

  private async getFunctionErrorMessage(error: unknown): Promise<string> {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string; message?: string };
        return payload.error || payload.message || 'No se pudo enviar el SMS.';
      } catch {
        return 'No se pudo enviar el SMS.';
      }
    }

    return error instanceof Error
      ? error.message
      : 'No se pudo enviar el SMS.';
  }

  private mapAdminMessage(item: unknown): AdminSmsMessage {
    const row = item as Record<string, unknown>;

    return {
      id: String(row['id'] ?? ''),
      user_id: String(row['user_id'] ?? ''),
      recipient: String(row['recipient'] ?? ''),
      message: String(row['message'] ?? ''),
      segments: Number(row['segments'] ?? 0),
      cost: Number(row['cost'] ?? 0),
      status: this.toMessageStatus(row['status']),
      provider_message_id: this.toNullableString(row['provider_message_id']),
      provider_response: this.toProviderResponse(row['provider_response']),
      error_message: this.toNullableString(row['error_message']),
      sent_at: this.toNullableString(row['sent_at']),
      created_at: String(row['created_at'] ?? ''),
      profile: this.toProfile(row['profile'])
    };
  }

  private toMessageStatus(value: unknown): AdminSmsMessage['status'] {
    return value === 'pending' || value === 'sent' || value === 'delivered' || value === 'failed'
      ? value
      : 'pending';
  }

  private toProviderResponse(value: unknown): SmsProviderResponse | null {
    return value && typeof value === 'object'
      ? value as SmsProviderResponse
      : null;
  }

  private toProfile(value: unknown): AdminSmsMessageProfile | null {
    const profile = Array.isArray(value) ? value[0] : value;

    if (!profile || typeof profile !== 'object') {
      return null;
    }

    const data = profile as Record<string, unknown>;

    return {
      full_name: this.toNullableString(data['full_name']),
      email: this.toNullableString(data['email']),
      razon_social: this.toNullableString(data['razon_social']),
      ruc: this.toNullableString(data['ruc'])
    };
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim()
      ? value
      : null;
  }
}

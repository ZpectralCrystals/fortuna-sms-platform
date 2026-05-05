import { Injectable, inject } from '@angular/core';
import {
  AdminSmsMessage,
  AdminSmsMessageFilters,
  AdminSmsMessageProfile,
  AdminSmsSendAttempt,
  ClientSmsMessage,
  ClientSmsStats,
  CreateSmsTemplateRequest,
  SmsProviderResponse,
  SmsSendRequest,
  SmsSendResult,
  SmsTemplate,
  SmsTemplateCategory,
  UpdateSmsTemplateRequest
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
        message: request.message,
        idempotency_key: request.idempotency_key
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
        delivered_at,
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

    if (filters.dateFrom) {
      query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59.999`);
    }

    query = query.limit(filters.limit ?? 100);

    const { data, error } = await query;

    if (error) {
      throw new Error('No se pudieron cargar los mensajes. Verifica permisos de administrador.');
    }

    const messages = ((data as unknown[]) ?? []).map((item) => this.mapAdminMessage(item));
    const attempts = await this.listAttemptsForMessages(messages.map((message) => message.id));
    const attemptsByMessageId = new Map(
      attempts
        .filter((attempt) => attempt.sms_message_id)
        .map((attempt) => [attempt.sms_message_id as string, attempt])
    );

    return messages.map((message) => ({
      ...message,
      attempt: attemptsByMessageId.get(message.id) ?? null
    }));
  }

  async listMyMessages(limit = 100): Promise<ClientSmsMessage[]> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.supabase.instance
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
        delivered_at,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('No se pudo cargar tu historial de SMS.');
    }

    const messages = ((data as unknown[]) ?? []).map((item) => this.mapClientMessage(item));
    const attempts = await this.listAttemptsForMessages(messages.map((message) => message.id));
    const attemptsByMessageId = new Map(
      attempts
        .filter((attempt) => attempt.sms_message_id)
        .map((attempt) => [attempt.sms_message_id as string, attempt])
    );

    return messages.map((message) => ({
      ...message,
      attempt: attemptsByMessageId.get(message.id) ?? null
    }));
  }

  async getRecentMyMessages(limit = 5): Promise<ClientSmsMessage[]> {
    return this.listMyMessages(limit);
  }

  async getMySmsStats(): Promise<ClientSmsStats> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.supabase.instance
      .from('sms_messages')
      .select('status, segments, cost')
      .eq('user_id', userId);

    if (error) {
      throw new Error('No se pudo cargar tu historial de SMS.');
    }

    const rows = ((data as unknown[]) ?? []).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        status: this.toMessageStatus(row['status']),
        segments: Number(row['segments'] ?? 0),
        cost: Number(row['cost'] ?? 0)
      };
    });
    const billableMessages = rows.filter((message) => message.status === 'sent' || message.status === 'delivered');

    return {
      total: rows.length,
      sent: rows.filter((message) => message.status === 'sent').length,
      delivered: rows.filter((message) => message.status === 'delivered').length,
      failed: rows.filter((message) => message.status === 'failed').length,
      pending: rows.filter((message) => message.status === 'pending').length,
      consumedSegments: billableMessages.reduce((total, message) => total + message.segments, 0),
      totalCost: billableMessages.reduce((total, message) => total + message.cost, 0)
    };
  }

  async uploadCampaign(_file: File): Promise<void> {
    // TODO: implement file upload flow.
  }

  extractTemplateVariables(content: string): string[] {
    const matches = content.matchAll(/\{([a-zA-Z0-9_-]+)\}/g);
    return Array.from(new Set(Array.from(matches, (match) => match[1]).filter(Boolean)));
  }

  renderTemplatePreview(content: string, values: Record<string, string>): string {
    return content.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, variableName: string) => {
      const value = values[variableName]?.trim();
      return value || match;
    });
  }

  renderTemplateExample(content: string): string {
    return content.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_match, variableName: string) =>
      this.getExampleValue(variableName)
    );
  }

  getExampleValue(variableName: string): string {
    const normalized = variableName.trim().toLowerCase();
    const examples: Record<string, string> = {
      nombre: 'Juan',
      codigo: '123456',
      empresa: 'Fortuna',
      fecha: '02/05/2026',
      monto: 'S/ 50.00'
    };

    return examples[normalized] ?? 'Ejemplo';
  }

  calculateSegments(message: string): number {
    return Math.ceil(message.length / 160) || 1;
  }

  async listTemplates(): Promise<SmsTemplate[]> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.supabase.instance
      .from('templates')
      .select('id, user_id, name, content, category, variables, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error('No se pudieron cargar las plantillas.');
    }

    return ((data as unknown[]) ?? []).map((item) => this.mapTemplate(item));
  }

  async listActiveTemplates(): Promise<SmsTemplate[]> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.supabase.instance
      .from('templates')
      .select('id, user_id, name, content, category, variables, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error('No se pudieron cargar las plantillas.');
    }

    return ((data as unknown[]) ?? []).map((item) => this.mapTemplate(item));
  }

  async getTemplate(id: string): Promise<SmsTemplate | null> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.supabase.instance
      .from('templates')
      .select('id, user_id, name, content, category, variables, is_active, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error('No se pudo cargar la plantilla.');
    }

    return data ? this.mapTemplate(data) : null;
  }

  async createTemplate(payload: CreateSmsTemplateRequest): Promise<SmsTemplate> {
    const userId = await this.getCurrentUserId();
    const content = payload.content.trim();

    const { data, error } = await this.supabase.instance
      .from('templates')
      .insert({
        user_id: userId,
        name: payload.name.trim(),
        content,
        category: payload.category,
        variables: this.extractTemplateVariables(content)
      })
      .select('id, user_id, name, content, category, variables, is_active, created_at, updated_at')
      .single();

    if (error) {
      throw new Error('No se pudo guardar la plantilla.');
    }

    return this.mapTemplate(data);
  }

  async updateTemplate(id: string, payload: UpdateSmsTemplateRequest): Promise<SmsTemplate> {
    const userId = await this.getCurrentUserId();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (payload.name !== undefined) updatePayload['name'] = payload.name.trim();
    if (payload.content !== undefined) {
      const content = payload.content.trim();
      updatePayload['content'] = content;
      updatePayload['variables'] = this.extractTemplateVariables(content);
    }
    if (payload.category !== undefined) updatePayload['category'] = payload.category;
    if (payload.variables !== undefined && payload.content === undefined) updatePayload['variables'] = payload.variables;
    if (payload.is_active !== undefined) updatePayload['is_active'] = payload.is_active;

    const { data, error } = await this.supabase.instance
      .from('templates')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, user_id, name, content, category, variables, is_active, created_at, updated_at')
      .single();

    if (error) {
      throw new Error('No se pudo guardar la plantilla.');
    }

    return this.mapTemplate(data);
  }

  async deleteTemplate(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { error } = await this.supabase.instance
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error('No se pudo eliminar la plantilla.');
    }
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
      delivered_at: this.toNullableString(row['delivered_at']),
      created_at: String(row['created_at'] ?? ''),
      profile: this.toProfile(row['profile']),
      attempt: null
    };
  }

  private mapClientMessage(item: unknown): ClientSmsMessage {
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
      delivered_at: this.toNullableString(row['delivered_at']),
      created_at: String(row['created_at'] ?? ''),
      attempt: null
    };
  }

  private async listAttemptsForMessages(messageIds: string[]): Promise<AdminSmsSendAttempt[]> {
    if (messageIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase.instance
      .from('sms_send_attempts')
      .select(`
        id,
        sms_message_id,
        idempotency_key,
        provider_recipient,
        status,
        provider,
        provider_response,
        error_message,
        started_at,
        completed_at,
        expires_at,
        created_at,
        updated_at
      `)
      .in('sms_message_id', messageIds);

    if (error) {
      return [];
    }

    return ((data as unknown[]) ?? []).map((item) => this.mapAdminSmsAttempt(item));
  }

  private mapAdminSmsAttempt(item: unknown): AdminSmsSendAttempt {
    const row = item as Record<string, unknown>;

    return {
      id: String(row['id'] ?? ''),
      sms_message_id: this.toNullableString(row['sms_message_id']),
      idempotency_key: String(row['idempotency_key'] ?? ''),
      provider_recipient: this.toNullableString(row['provider_recipient']),
      status: this.toAttemptStatus(row['status']),
      provider: this.toNullableString(row['provider']),
      provider_response: this.toProviderResponse(row['provider_response']),
      error_message: this.toNullableString(row['error_message']),
      started_at: this.toNullableString(row['started_at']),
      completed_at: this.toNullableString(row['completed_at']),
      expires_at: this.toNullableString(row['expires_at']),
      created_at: String(row['created_at'] ?? ''),
      updated_at: this.toNullableString(row['updated_at'])
    };
  }

  private async getCurrentUserId(): Promise<string> {
    const { data, error } = await this.supabase.instance.auth.getSession();
    const userId = data.session?.user?.id;

    if (error || !userId) {
      throw new Error('Sesión inválida.');
    }

    return userId;
  }

  private mapTemplate(item: unknown): SmsTemplate {
    const row = item as Record<string, unknown>;

    return {
      id: String(row['id'] ?? ''),
      user_id: String(row['user_id'] ?? ''),
      name: String(row['name'] ?? ''),
      content: String(row['content'] ?? ''),
      category: this.toTemplateCategory(row['category']),
      variables: this.toStringArray(row['variables']),
      is_active: row['is_active'] !== false,
      created_at: String(row['created_at'] ?? ''),
      updated_at: String(row['updated_at'] ?? row['created_at'] ?? '')
    };
  }

  private toTemplateCategory(value: unknown): SmsTemplateCategory {
    return value === 'general' ||
      value === 'marketing' ||
      value === 'cobranza' ||
      value === 'recordatorio' ||
      value === 'soporte' ||
      value === 'otro'
      ? value
      : 'general';
  }

  private toMessageStatus(value: unknown): AdminSmsMessage['status'] {
    return value === 'pending' || value === 'sent' || value === 'delivered' || value === 'failed'
      ? value
      : 'pending';
  }

  private toAttemptStatus(value: unknown): AdminSmsSendAttempt['status'] {
    return value === 'processing' || value === 'sent' || value === 'failed'
      ? value
      : 'processing';
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

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  }
}

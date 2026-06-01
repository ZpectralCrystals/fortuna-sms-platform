import { Injectable, inject } from '@angular/core';
import { ApiKey, BackofficeApiKey, CreatedApiKey } from '../models/api-key.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ApiKeysService {
  private readonly supabase = inject(SupabaseService);

  async list(): Promise<ApiKey[]> {
    const { data, error } = await this.supabase.instance
      .from('api_keys_safe')
      .select('id,user_id,name,key_prefix,scopes,is_active,last_used_at,expires_at,revoked_at,created_at,updated_at,rate_limit_per_minute,rate_limit_per_day,description')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudieron cargar las API Keys: ${error.message}`);
    }

    return ((data as unknown[]) ?? []).map((row) => this.mapApiKey(row));
  }

  async create(name: string): Promise<CreatedApiKey> {
    const { data, error } = await this.supabase.instance.rpc('create_api_key', {
      p_name: name.trim(),
      p_scopes: ['sms:send']
    });

    if (error) {
      throw new Error(this.toFriendlyError(error.message));
    }

    const row = this.toRecord(data);
    const apiKey = this.toSafeString(row['api_key']);

    if (!apiKey) {
      throw new Error('No se recibió la API Key creada.');
    }

    return {
      ...this.mapApiKey(row),
      value: apiKey
    };
  }

  async revoke(id: string): Promise<void> {
    const { error } = await this.supabase.instance.rpc('revoke_api_key', {
      p_key_id: id
    });

    if (error) {
      throw new Error(this.toFriendlyError(error.message));
    }
  }

  async listBackoffice(): Promise<BackofficeApiKey[]> {
    const { data, error } = await this.supabase.instance
      .from('admin_api_keys_safe')
      .select('id,user_id,client_email,client_name,client_company,name,key_prefix,scopes,is_active,last_used_at,expires_at,revoked_at,created_at,updated_at,rate_limit_per_minute,rate_limit_per_day,description')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudieron cargar las API Keys: ${error.message}`);
    }

    return ((data as unknown[]) ?? []).map((row) => this.mapBackofficeApiKey(row));
  }

  async adminRevoke(id: string): Promise<void> {
    const { error } = await this.supabase.instance.rpc('admin_revoke_api_key', {
      p_key_id: id
    });

    if (error) {
      throw new Error(this.toFriendlyError(error.message));
    }
  }

  async providerRegister(ruc: string, nombre: string): Promise<ProviderApiKeyEdgeResult> {
    return await this.invokeProviderApiKey('admin-register-api-key', { ruc, nombre });
  }

  async providerDelete(ruc: string, payload: { nombre?: string; id?: string }): Promise<ProviderApiKeyEdgeResult> {
    return await this.invokeProviderApiKey('admin-delete-api-key', { ruc, ...payload });
  }

  async providerConsult(ruc: string): Promise<ProviderApiKeyEdgeResult> {
    return await this.invokeProviderApiKey('admin-consult-api-key', { ruc });
  }

  async providerList(): Promise<ProviderApiKeyEdgeResult> {
    return await this.invokeProviderApiKey('admin-list-api-keys', {});
  }

  private mapBackofficeApiKey(value: unknown): BackofficeApiKey {
    const row = this.toRecord(value);

    return {
      ...this.mapApiKey(row),
      userId: this.toSafeString(row['user_id']),
      clientEmail: this.toSafeString(row['client_email']),
      clientName: this.toNullableString(row['client_name']),
      clientCompany: this.toNullableString(row['client_company'])
    };
  }

  private mapApiKey(value: unknown): ApiKey {
    const row = this.toRecord(value);

    return {
      id: this.toSafeString(row['id']),
      name: this.toSafeString(row['name']),
      keyPrefix: this.toSafeString(row['key_prefix']),
      scopes: this.toStringArray(row['scopes']),
      isActive: row['is_active'] === true,
      lastUsedAt: this.toNullableString(row['last_used_at']),
      expiresAt: this.toNullableString(row['expires_at']),
      revokedAt: this.toNullableString(row['revoked_at']),
      createdAt: this.toSafeString(row['created_at']) || new Date().toISOString(),
      updatedAt: this.toNullableString(row['updated_at']),
      rateLimitPerMinute: Number(row['rate_limit_per_minute'] ?? 60),
      rateLimitPerDay: Number(row['rate_limit_per_day'] ?? 1000),
      description: this.toNullableString(row['description'])
    };
  }

  private async invokeProviderApiKey(
    functionName: string,
    body: Record<string, unknown>
  ): Promise<ProviderApiKeyEdgeResult> {
    const { data, error } = await this.supabase.instance.functions.invoke(functionName, { body });
    if (error) {
      throw new Error(`No se pudo ejecutar ${functionName}: ${error.message}`);
    }

    const row = this.toRecord(data);
    if (row['success'] !== true) {
      throw new Error(this.toSafeString(row['error']) || 'Operación API Key proveedor fallida.');
    }

    return {
      success: true,
      provider: this.toSafeString(row['provider']),
      result: this.toRecord(row['result'])
    };
  }

  private toFriendlyError(message: string): string {
    if (message.includes('PROFILE_INACTIVE')) {
      return 'Tu cuenta está inactiva. No puedes crear API Keys.';
    }

    if (message.includes('API_KEY_NAME_REQUIRED')) {
      return 'Ingresa un nombre para la API Key.';
    }

    if (message.includes('API_KEY_NAME_TOO_LONG')) {
      return 'El nombre de la API Key es demasiado largo.';
    }

    if (message.includes('API_KEY_NOT_FOUND')) {
      return 'API Key no encontrada.';
    }

    if (message.includes('NOT_AUTHORIZED')) {
      return 'No tienes permisos para realizar esta acción.';
    }

    return message;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private toSafeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}

export interface ProviderApiKeyEdgeResult {
  success: boolean;
  provider: string;
  result: Record<string, unknown>;
}

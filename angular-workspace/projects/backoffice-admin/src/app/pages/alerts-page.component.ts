import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '@sms-fortuna/shared';
import { LoadingStateComponent } from '../components/loading-state.component';

interface LowBalanceConfig {
  id: string | null;
  threshold_credits: number;
  is_active: boolean;
  notify_admin: boolean;
  notify_client: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface LowBalanceClient {
  id: string;
  email: string;
  full_name: string | null;
  razon_social: string | null;
  ruc: string | null;
  credits: number;
  is_active: boolean;
  updated_at: string | null;
}

interface LowBalanceAlert {
  id: string;
  user_id: string;
  credits_at_alert: number;
  threshold_credits: number;
  alert_type: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  created_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
    razon_social: string | null;
    ruc: string | null;
  } | null;
}

@Component({
  selector: 'bo-alerts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent],
  templateUrl: './alerts-page.component.html',
  styleUrl: './alerts-page.component.scss'
})
export class AlertsPageComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  config: LowBalanceConfig = this.defaultConfig();
  lowBalanceClients: LowBalanceClient[] = [];
  recentAlerts: LowBalanceAlert[] = [];

  get totalAlerts(): number {
    return this.recentAlerts.length;
  }

  get pendingAlerts(): number {
    return this.recentAlerts.filter((alert) => alert.status === 'pending').length;
  }

  get sentAlerts(): number {
    return this.recentAlerts.filter((alert) => alert.status === 'sent').length;
  }

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      this.config = await this.loadConfig();
      const [clients, alerts] = await Promise.all([
        this.loadLowBalanceClients(this.config.threshold_credits),
        this.loadRecentAlerts()
      ]);
      this.lowBalanceClients = clients;
      this.recentAlerts = alerts;
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar el módulo de alertas.';
      this.lowBalanceClients = [];
      this.recentAlerts = [];
    } finally {
      this.loading = false;
    }
  }

  async saveConfig(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.config.threshold_credits < 0) {
      this.errorMessage = 'El umbral no puede ser negativo.';
      return;
    }

    this.saving = true;

    try {
      const { data, error } = await this.supabaseService.instance.rpc('admin_upsert_low_balance_config', {
        p_threshold_credits: this.config.threshold_credits,
        p_is_active: this.config.is_active,
        p_notify_admin: this.config.notify_admin,
        p_notify_client: this.config.notify_client
      });

      if (error) {
        throw error;
      }

      const response = data as { config?: unknown } | null;
      this.config = this.mapConfig(response?.config ?? null);
      this.lowBalanceClients = await this.loadLowBalanceClients(this.config.threshold_credits);
      this.successMessage = 'Configuración de alerta guardada correctamente.';
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      this.errorMessage = message.includes('NOT_AUTHORIZED')
        ? 'No tienes permisos de administrador.'
        : message.includes('INVALID_THRESHOLD')
          ? 'El umbral ingresado no es válido.'
          : 'No se pudo guardar la configuración. Verifica que la migración de alertas esté aplicada.';
    } finally {
      this.saving = false;
    }
  }

  clientName(client: LowBalanceClient): string {
    return client.full_name || client.razon_social || client.email || 'Cliente sin nombre';
  }

  alertClientName(alert: LowBalanceAlert): string {
    return alert.profile?.full_name || alert.profile?.razon_social || alert.profile?.email || 'Cliente sin nombre';
  }

  alertClientEmail(alert: LowBalanceAlert): string {
    return alert.profile?.email || '-';
  }

  statusLabel(status: LowBalanceAlert['status']): string {
    const labels: Record<LowBalanceAlert['status'], string> = {
      pending: 'Pendiente',
      sent: 'Enviada',
      failed: 'Fallida'
    };

    return labels[status];
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  private async loadConfig(): Promise<LowBalanceConfig> {
    const { data, error } = await this.supabaseService.instance
      .from('low_balance_config')
      .select('id,threshold_credits,is_active,notify_admin,notify_client,created_at,updated_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error('No se pudo cargar la configuración. Ejecuta la migración de alertas.');
    }

    return this.mapConfig(data);
  }

  private async loadLowBalanceClients(threshold: number): Promise<LowBalanceClient[]> {
    const [profilesResult, adminsResult] = await Promise.all([
      this.supabaseService.instance
        .from('profiles')
        .select('id,email,full_name,razon_social,ruc,credits,is_active,updated_at')
        .lte('credits', threshold)
        .order('credits', { ascending: true }),
      this.supabaseService.instance
        .from('admins')
        .select('id')
    ]);

    if (profilesResult.error) {
      throw new Error('No se pudieron cargar los clientes con saldo bajo.');
    }

    if (adminsResult.error) {
      throw new Error('No se pudieron validar administradores.');
    }

    const adminIds = new Set(((adminsResult.data as unknown[]) ?? [])
      .map((admin) => String((admin as Record<string, unknown>)['id'] ?? ''))
      .filter(Boolean));

    return ((profilesResult.data as unknown[]) ?? [])
      .map((profile) => this.mapLowBalanceClient(profile))
      .filter((profile) => profile.id && !adminIds.has(profile.id));
  }

  private async loadRecentAlerts(): Promise<LowBalanceAlert[]> {
    const { data, error } = await this.supabaseService.instance
      .from('low_balance_alerts')
      .select(`
        id,
        user_id,
        credits_at_alert,
        threshold_credits,
        alert_type,
        status,
        sent_at,
        created_at,
        profile:profiles (
          full_name,
          email,
          razon_social,
          ruc
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error('No se pudo cargar el historial de alertas.');
    }

    return ((data as unknown[]) ?? []).map((alert) => this.mapAlert(alert));
  }

  private mapConfig(value: unknown): LowBalanceConfig {
    const row = value && typeof value === 'object'
      ? value as Record<string, unknown>
      : {};

    return {
      id: this.toNullableString(row['id']),
      threshold_credits: Number(row['threshold_credits'] ?? 10),
      is_active: Boolean(row['is_active'] ?? true),
      notify_admin: Boolean(row['notify_admin'] ?? true),
      notify_client: Boolean(row['notify_client'] ?? false),
      created_at: this.toNullableString(row['created_at']),
      updated_at: this.toNullableString(row['updated_at'])
    };
  }

  private mapLowBalanceClient(value: unknown): LowBalanceClient {
    const row = value as Record<string, unknown>;

    return {
      id: this.toSafeString(row['id']),
      email: this.toSafeString(row['email']),
      full_name: this.toNullableString(row['full_name']),
      razon_social: this.toNullableString(row['razon_social']),
      ruc: this.toNullableString(row['ruc']),
      credits: Number(row['credits'] ?? 0),
      is_active: Boolean(row['is_active'] ?? false),
      updated_at: this.toNullableString(row['updated_at'])
    };
  }

  private mapAlert(value: unknown): LowBalanceAlert {
    const row = value as Record<string, unknown>;
    const profile = Array.isArray(row['profile']) ? row['profile'][0] : row['profile'];

    return {
      id: this.toSafeString(row['id']),
      user_id: this.toSafeString(row['user_id']),
      credits_at_alert: Number(row['credits_at_alert'] ?? 0),
      threshold_credits: Number(row['threshold_credits'] ?? 0),
      alert_type: this.toSafeString(row['alert_type']) || 'low_balance',
      status: this.toAlertStatus(row['status']),
      sent_at: this.toNullableString(row['sent_at']),
      created_at: this.toSafeString(row['created_at']) || new Date().toISOString(),
      profile: profile && typeof profile === 'object'
        ? {
            full_name: this.toNullableString((profile as Record<string, unknown>)['full_name']),
            email: this.toNullableString((profile as Record<string, unknown>)['email']),
            razon_social: this.toNullableString((profile as Record<string, unknown>)['razon_social']),
            ruc: this.toNullableString((profile as Record<string, unknown>)['ruc'])
          }
        : null
    };
  }

  private toAlertStatus(value: unknown): LowBalanceAlert['status'] {
    return value === 'sent' || value === 'failed' || value === 'pending'
      ? value
      : 'pending';
  }

  private defaultConfig(): LowBalanceConfig {
    return {
      id: null,
      threshold_credits: 10,
      is_active: true,
      notify_admin: true,
      notify_client: false,
      created_at: null,
      updated_at: null
    };
  }

  private toSafeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}

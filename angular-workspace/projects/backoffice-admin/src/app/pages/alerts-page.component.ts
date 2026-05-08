import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '@sms-fortuna/shared';
import { LoadingStateComponent } from '../components/loading-state.component';

const SMS_PRICE = 0.08;

interface AlertConfig {
  id: string | null;
  is_active: boolean;
  threshold_amount: number;
  threshold_credits: number;
  cooldown_hours: number;
  send_sms: boolean;
  send_email: boolean;
  message_template: string;
  created_at: string | null;
  updated_at: string | null;
}

interface AlertStatistics {
  total_alerts: number;
  alerts_today: number;
  alerts_this_week: number;
  alerts_this_month: number;
  unique_users_alerted: number;
}

interface LowBalanceClient {
  id: string;
  email: string;
  full_name: string | null;
  razon_social: string | null;
  ruc: string | null;
  credits: number;
  is_active: boolean;
}

interface RecentAlert {
  alert_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  balance_at_alert: number;
  amount_equivalent: number;
  message_sent: string | null;
  sent_at: string | null;
  created_at: string;
  sent_via: string;
  delivery_status: 'pending' | 'sent' | 'failed';
}

interface AlertStatsRow {
  user_id: string;
  created_at: string;
}

interface InternalAlertsAccount {
  profile_id: string;
  account_type: string;
  label: string;
  is_active: boolean;
  email: string;
  full_name: string | null;
  credits: number;
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
  sending = false;
  errorMessage = '';
  successMessage = '';
  config: AlertConfig | null = null;
  originalConfig: AlertConfig | null = null;
  stats: AlertStatistics = this.emptyStats();
  lowBalanceClients: LowBalanceClient[] = [];
  recentAlerts: RecentAlert[] = [];

  internalAccount: InternalAlertsAccount | null = null;
  internalAccountLoading = false;
  internalAccountError = '';
  internalAccountMessage = '';
  configuredInternalProfileId: string | null = null;
  showAllocateModal = false;
  allocateAmount = 100;
  allocateReason = '';
  allocationError = '';
  allocating = false;
  ensuringInternalAccount = false;

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await Promise.all([
        this.loadConfig(),
        this.loadRecentAlerts(),
        this.loadAlertStatistics()
      ]);
      await this.loadLowBalanceClients();
      await this.loadInternalAccount();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar la configuración';
      this.config = null;
      this.originalConfig = null;
      this.stats = this.emptyStats();
      this.lowBalanceClients = [];
      this.recentAlerts = [];
    } finally {
      this.loading = false;
    }
  }

  async loadInternalAccount(): Promise<void> {
    this.internalAccountLoading = true;
    this.internalAccountError = '';

    try {
      const { data, error } = await this.supabaseService.instance.rpc('admin_get_internal_alerts_account');

      if (error) {
        throw error;
      }

      const response = data as { account?: unknown; configured_profile_id?: unknown } | null;
      this.internalAccount = this.mapInternalAccount(response?.account ?? null);
      this.configuredInternalProfileId = this.toNullableString(response?.configured_profile_id);
    } catch (error) {
      this.internalAccount = null;
      this.configuredInternalProfileId = null;
      this.internalAccountError = this.toFriendlyError(error, 'No se pudo cargar la cuenta interna de alertas.');
    } finally {
      this.internalAccountLoading = false;
    }
  }

  async ensureInternalAccount(): Promise<void> {
    this.internalAccountError = '';
    this.internalAccountMessage = '';
    this.ensuringInternalAccount = true;

    try {
      const { data, error } = await this.supabaseService.instance.rpc('admin_ensure_internal_alerts_account');

      if (error) {
        throw error;
      }

      const response = data as { success?: boolean; created?: boolean; error?: string; message?: string } | null;

      if (response && response.success === false) {
        this.internalAccountError = response.message
          || 'Falta crear el usuario auth con email alerts@smsfortuna.internal antes de asociar la cuenta interna.';
        return;
      }

      this.internalAccountMessage = response?.created
        ? 'Cuenta interna asociada y configurada para alertas.'
        : 'Cuenta interna ya estaba configurada.';

      await this.loadInternalAccount();
    } catch (error) {
      this.internalAccountError = this.toFriendlyError(error, 'No se pudo configurar la cuenta interna.');
    } finally {
      this.ensuringInternalAccount = false;
    }
  }

  openAllocateModal(): void {
    if (!this.internalAccount) {
      return;
    }

    this.allocateAmount = 100;
    this.allocateReason = 'Bolsa para alertas de saldo bajo';
    this.internalAccountError = '';
    this.internalAccountMessage = '';
    this.allocationError = '';
    this.showAllocateModal = true;
  }

  openAllocateInternalSmsModal(): void {
    this.openAllocateModal();
  }

  closeAllocateModal(): void {
    this.showAllocateModal = false;
    this.allocating = false;
    this.allocationError = '';
  }

  closeAllocateInternalSmsModal(): void {
    this.closeAllocateModal();
  }

  async submitAllocation(): Promise<void> {
    if (!this.internalAccount || this.allocating) {
      return;
    }

    const amount = Math.trunc(this.toNumber(this.allocateAmount));

    if (!Number.isFinite(amount) || amount <= 0) {
      this.allocationError = 'Ingresa una cantidad válida de SMS.';
      return;
    }

    this.allocating = true;
    this.internalAccountError = '';
    this.internalAccountMessage = '';
    this.allocationError = '';

    try {
      const { error } = await this.supabaseService.instance.rpc('admin_allocate_internal_sms', {
        p_profile_id: this.internalAccount.profile_id,
        p_sms_amount: amount,
        p_reason: this.allocateReason?.trim() || null
      });

      if (error) {
        throw error;
      }

      this.internalAccountMessage = 'SMS internos asignados correctamente.';
      this.showAllocateModal = false;
      await this.loadInternalAccount();
    } catch (error) {
      this.allocationError = this.toFriendlyError(error, 'No se pudo asignar SMS internos.');
    } finally {
      this.allocating = false;
    }
  }

  async confirmAllocateInternalSms(): Promise<void> {
    await this.submitAllocation();
  }

  loadInternalAlertsAccount(): Promise<void> {
    return this.loadInternalAccount();
  }

  canConfirmAllocation(): boolean {
    const amount = Math.trunc(this.toNumber(this.allocateAmount));
    return Boolean(this.internalAccount) && Number.isFinite(amount) && amount > 0 && !this.allocating;
  }

  internalAccountName(): string {
    if (!this.internalAccount) {
      return '';
    }

    return this.internalAccount.label
      || this.internalAccount.full_name
      || this.internalAccount.email
      || 'Cuenta interna';
  }

  async loadConfig(): Promise<void> {
    const { data, error } = await this.supabaseService.instance
      .from('low_balance_config')
      .select('id,is_active,threshold_amount,threshold_credits,cooldown_hours,send_sms,send_email,message_template,created_at,updated_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error('No se pudo cargar la configuración. Ejecuta las migraciones de alertas.');
    }

    const config = this.mapConfig(data);
    this.config = { ...config };
    this.originalConfig = { ...config };
  }

  async loadLowBalanceClients(): Promise<void> {
    const threshold = this.config?.threshold_credits ?? 0;
    const [profilesResult, adminsResult] = await Promise.all([
      this.supabaseService.instance
        .from('profiles')
        .select('id,email,full_name,razon_social,ruc,credits,is_active')
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

    this.lowBalanceClients = ((profilesResult.data as unknown[]) ?? [])
      .map((profile) => this.mapLowBalanceClient(profile))
      .filter((profile) => profile.id && !adminIds.has(profile.id));
  }

  async loadRecentAlerts(): Promise<void> {
    const { data, error } = await this.supabaseService.instance
      .from('low_balance_alerts')
      .select(`
        id,
        user_id,
        credits_at_alert,
        threshold_credits,
        status,
        sent_at,
        created_at,
        sent_via,
        message_sent,
        profile:profiles (
          full_name,
          email,
          phone,
          razon_social,
          ruc
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error('No se pudo cargar el historial de alertas.');
    }

    this.recentAlerts = ((data as unknown[]) ?? []).map((alert) => this.mapRecentAlert(alert));
  }

  async loadAlertStatistics(): Promise<void> {
    const { data, error } = await this.supabaseService.instance
      .from('low_balance_alerts')
      .select('user_id,created_at');

    if (error) {
      throw new Error('No se pudieron cargar las métricas de alertas.');
    }

    const rows = ((data as unknown[]) ?? []).map((alert) => {
      const row = alert as Record<string, unknown>;
      return {
        user_id: this.toSafeString(row['user_id']),
        created_at: this.toSafeString(row['created_at']) || new Date().toISOString()
      };
    });

    this.stats = this.buildStats(rows);
  }

  handleConfigChange<K extends keyof AlertConfig>(field: K, value: AlertConfig[K]): void {
    if (!this.config) {
      return;
    }

    this.config = {
      ...this.config,
      [field]: value
    };
  }

  handleThresholdAmountChange(value: string | number): void {
    const amount = this.toNumber(value);
    this.handleConfigChange('threshold_amount', amount);
    this.handleConfigChange('threshold_credits', Math.round(amount / SMS_PRICE));
  }

  handleThresholdCreditsChange(value: string | number): void {
    const credits = this.toNumber(value);
    this.handleConfigChange('threshold_credits', credits);
    this.handleConfigChange('threshold_amount', Number((credits * SMS_PRICE).toFixed(2)));
  }

  handleCooldownChange(value: string | number): void {
    this.handleConfigChange('cooldown_hours', Math.max(0, Math.trunc(this.toNumber(value))));
  }

  resetConfig(): void {
    if (!this.originalConfig) {
      return;
    }

    this.config = { ...this.originalConfig };
    this.errorMessage = '';
    this.successMessage = '';
  }

  async saveConfig(): Promise<void> {
    if (!this.config) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (this.config.threshold_amount < 0 || this.config.threshold_credits < 0) {
      this.errorMessage = 'El umbral no puede ser negativo.';
      return;
    }

    if (!this.config.message_template.trim()) {
      this.errorMessage = 'El mensaje de alerta no puede estar vacío.';
      return;
    }

    this.saving = true;

    try {
      const { data, error } = await this.supabaseService.instance.rpc('admin_upsert_low_balance_config', {
        p_is_active: this.config.is_active,
        p_threshold_amount: this.config.threshold_amount,
        p_threshold_credits: this.config.threshold_credits,
        p_cooldown_hours: this.config.cooldown_hours,
        p_send_sms: this.config.send_sms,
        p_send_email: false,
        p_message_template: this.config.message_template
      });

      if (error) {
        throw error;
      }

      const response = data as { config?: unknown } | null;
      const config = this.mapConfig(response?.config ?? null);
      this.config = { ...config };
      this.originalConfig = { ...config };
      await this.loadConfig();
      await this.loadLowBalanceClients();
      this.successMessage = 'Configuración guardada exitosamente';
    } catch (error) {
      this.errorMessage = this.toFriendlyError(error, 'Error al guardar configuración');
    } finally {
      this.saving = false;
    }
  }

  async sendAlerts(): Promise<void> {
    if (!this.config?.is_active) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.sending = true;

    try {
      const { data, error } = await this.supabaseService.instance.rpc('admin_generate_low_balance_alerts');

      if (error) {
        throw error;
      }

      const result = data as { generated?: number; skipped?: number } | null;
      const generated = Number(result?.generated ?? 0);
      const skipped = Number(result?.skipped ?? 0);
      const skippedText = skipped > 0 ? ` ${skipped} omitidas por espera.` : '';
      this.successMessage = generated > 0
        ? `Alertas generadas correctamente.${skippedText}`
        : `No hay nuevas alertas para generar.${skippedText}`;
      await Promise.all([
        this.loadRecentAlerts(),
        this.loadLowBalanceClients(),
        this.loadAlertStatistics()
      ]);
    } catch (error) {
      this.errorMessage = this.toFriendlyError(error, 'Error al generar alertas');
    } finally {
      this.sending = false;
    }
  }

  clientName(client: LowBalanceClient): string {
    return client.full_name || client.razon_social || client.email || 'Cliente sin nombre';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
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

  statusLabel(status: RecentAlert['delivery_status']): string {
    if (status === 'sent') {
      return 'Enviado';
    }

    if (status === 'failed') {
      return 'Fallido';
    }

    return 'Pendiente';
  }

  private buildStats(alerts: AlertStatsRow[]): AlertStatistics {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    const day = weekStart.getDay();
    const diff = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - diff);

    return {
      total_alerts: alerts.length,
      alerts_today: alerts.filter((alert) => new Date(alert.created_at).getTime() >= today.getTime()).length,
      alerts_this_week: alerts.filter((alert) => new Date(alert.created_at).getTime() >= weekStart.getTime()).length,
      alerts_this_month: alerts.filter((alert) => {
        const date = new Date(alert.created_at);
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      }).length,
      unique_users_alerted: new Set(alerts.map((alert) => alert.user_id).filter(Boolean)).size
    };
  }

  private mapConfig(value: unknown): AlertConfig {
    const row = value && typeof value === 'object'
      ? value as Record<string, unknown>
      : {};
    const thresholdCredits = Number(row['threshold_credits'] ?? 10);
    const thresholdAmount = Number(row['threshold_amount'] ?? Number((thresholdCredits * SMS_PRICE).toFixed(2)));

    return {
      id: this.toNullableString(row['id']),
      is_active: Boolean(row['is_active'] ?? true),
      threshold_amount: thresholdAmount,
      threshold_credits: thresholdCredits,
      cooldown_hours: Number(row['cooldown_hours'] ?? 24),
      send_sms: Boolean(row['send_sms'] ?? false),
      send_email: Boolean(row['send_email'] ?? true),
      message_template: this.toSafeString(row['message_template']) ||
        'Hola {name}, tu saldo es bajo ({balance} SMS ≈ S/ {amount}). Recarga ahora para no interrumpir tus operaciones.',
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
      is_active: Boolean(row['is_active'] ?? false)
    };
  }

  private mapRecentAlert(value: unknown): RecentAlert {
    const row = value as Record<string, unknown>;
    const profile = Array.isArray(row['profile']) ? row['profile'][0] : row['profile'];
    const profileRow = profile && typeof profile === 'object'
      ? profile as Record<string, unknown>
      : {};
    const credits = Number(row['credits_at_alert'] ?? 0);

    return {
      alert_id: this.toSafeString(row['id']),
      user_id: this.toSafeString(row['user_id']),
      user_name: this.toSafeString(profileRow['full_name']) ||
        this.toSafeString(profileRow['razon_social']) ||
        this.toSafeString(profileRow['email']) ||
        'Cliente sin nombre',
      user_email: this.toSafeString(profileRow['email']) || '-',
      user_phone: this.toNullableString(profileRow['phone']),
      balance_at_alert: credits,
      amount_equivalent: Number((credits * SMS_PRICE).toFixed(2)),
      message_sent: this.toNullableString(row['message_sent']),
      sent_at: this.toNullableString(row['sent_at']),
      created_at: this.toSafeString(row['created_at']) || new Date().toISOString(),
      sent_via: this.toSafeString(row['sent_via']) || 'pending',
      delivery_status: this.toAlertStatus(row['status'])
    };
  }

  private emptyStats(): AlertStatistics {
    return {
      total_alerts: 0,
      alerts_today: 0,
      alerts_this_week: 0,
      alerts_this_month: 0,
      unique_users_alerted: 0
    };
  }

  private toAlertStatus(value: unknown): RecentAlert['delivery_status'] {
    return value === 'sent' || value === 'failed' || value === 'pending'
      ? value
      : 'pending';
  }

  private toNumber(value: string | number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toFriendlyError(error: unknown, fallback: string): string {
    const message = error instanceof Error ? error.message : '';

    if (message.includes('NOT_AUTHORIZED')) {
      return 'No tienes permisos de administrador.';
    }

    if (message.includes('ALERTS_DISABLED')) {
      return 'El sistema de alertas está desactivado.';
    }

    if (message.includes('CONFIG_NOT_FOUND')) {
      return 'No se encontró configuración de alertas.';
    }

    if (message.includes('NOT_INTERNAL_ACCOUNT')) {
      return 'El perfil indicado no es una cuenta interna activa.';
    }

    if (message.includes('INTERNAL_PROFILE_MISSING')) {
      return 'Falta crear el usuario auth con email alerts@smsfortuna.internal antes de asociar la cuenta interna.';
    }

    if (message.includes('INVALID_AMOUNT')) {
      return 'La cantidad de SMS debe ser mayor a cero.';
    }

    if (message.includes('INVALID_PROFILE')) {
      return 'Perfil interno inválido.';
    }

    if (message.includes('INVALID_') || message.includes('EMPTY_MESSAGE_TEMPLATE')) {
      return 'Revisa la configuración ingresada.';
    }

    return message || fallback;
  }

  private mapInternalAccount(value: unknown): InternalAlertsAccount | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const row = value as Record<string, unknown>;
    const profileId = this.toSafeString(row['profile_id']);

    if (!profileId) {
      return null;
    }

    return {
      profile_id: profileId,
      account_type: this.toSafeString(row['account_type']) || 'low_balance_alerts',
      label: this.toSafeString(row['label']) || 'SMS Fortuna Alertas',
      is_active: Boolean(row['is_active'] ?? true),
      email: this.toSafeString(row['email']),
      full_name: this.toNullableString(row['full_name']),
      credits: Number(row['credits'] ?? 0)
    };
  }

  private toSafeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}

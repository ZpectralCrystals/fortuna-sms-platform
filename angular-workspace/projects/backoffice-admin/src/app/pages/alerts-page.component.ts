import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoadingStateComponent } from '../components/loading-state.component';

interface AlertConfig {
  id: string;
  is_enabled: boolean;
  threshold_amount: number;
  threshold_sms_count: number;
  alert_message: string;
  cooldown_hours: number;
  send_via_sms: boolean;
  send_via_email: boolean;
  created_at: string;
  updated_at: string;
}

interface AlertStatistics {
  total_alerts: number;
  alerts_today: number;
  alerts_this_week: number;
  alerts_this_month: number;
  unique_users_alerted: number;
}

interface RecentAlert {
  alert_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  balance_at_alert: number;
  amount_equivalent: number;
  message_sent: string;
  sent_at: string;
  sent_via: string;
  delivery_status: string;
}

@Component({
  selector: 'bo-alerts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent],
  templateUrl: './alerts-page.component.html',
  styleUrl: './alerts-page.component.scss'
})
export class AlertsPageComponent implements OnInit {
  loading = true;
  saving = false;
  sending = false;
  showSuccess = false;
  successMessage = '';
  config: AlertConfig | null = null;
  stats: AlertStatistics = {
    total_alerts: 0,
    alerts_today: 0,
    alerts_this_week: 0,
    alerts_this_month: 0,
    unique_users_alerted: 0,
  };
  recentAlerts: RecentAlert[] = [];

  private readonly defaultConfig: AlertConfig = {
    id: 'visual-safe-config',
    is_enabled: true,
    threshold_amount: 10,
    threshold_sms_count: 250,
    alert_message: 'Hola {name}, tu saldo SMS es bajo: {balance} SMS ({amount}). Recarga para continuar enviando mensajes.',
    cooldown_hours: 24,
    send_via_sms: true,
    send_via_email: false,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };

  ngOnInit(): void {
    this.config = { ...this.defaultConfig };
    this.recentAlerts = [];
    this.loading = false;
  }

  handleConfigChange<K extends keyof AlertConfig>(field: K, value: AlertConfig[K]): void {
    if (!this.config) {
      return;
    }

    this.config = {
      ...this.config,
      [field]: value,
    };
  }

  resetConfig(): void {
    this.config = { ...this.defaultConfig };
  }

  saveConfig(): void {
    this.saving = true;
    this.successMessage = 'La configuración segura de alertas se conectará cuando exista backend y RPC definidos.';
    this.showSuccess = true;
    this.saving = false;
  }

  sendAlerts(): void {
    this.sending = true;
    this.successMessage = 'El envío seguro de alertas se conectará cuando exista backend y Edge Function definidos.';
    this.showSuccess = true;
    this.sending = false;
  }

  toNumber(value: string | number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  toInteger(value: string | number): number {
    const parsed = parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PE').format(value || 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value || 0);
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  deliveryStatusLabel(status: string): string {
    if (status === 'sent') {
      return 'Enviado';
    }

    if (status === 'failed') {
      return 'Fallido';
    }

    return 'Pendiente';
  }
}

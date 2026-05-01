import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!loading && !config" class="config-error">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <p>No se pudo cargar la configuración</p>
    </div>

    <div *ngIf="!loading && config" class="alerts-page">
      <div class="page-header">
        <div>
          <h1>Alertas de Saldo Bajo</h1>
          <p>Sistema automático de notificaciones por SMS</p>
        </div>
        <button type="button" class="send-button" [disabled]="!config.is_enabled || sending" (click)="sendAlerts()">
          <ng-container *ngIf="sending; else sendReady">
            <span class="button-spinner"></span>
            Enviando...
          </ng-container>
          <ng-template #sendReady>
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            Enviar Alertas Ahora
          </ng-template>
        </button>
      </div>

      <div *ngIf="showSuccess" class="success-box">
        <svg class="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
        <p>{{ successMessage }}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <p>Total Alertas</p>
            <svg class="stat-icon blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10.268 21a2 2 0 0 0 3.464 0" />
              <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
            </svg>
          </div>
          <p class="stat-value">{{ stats.total_alerts }}</p>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <p>Hoy</p>
            <svg class="stat-icon green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p class="stat-value">{{ stats.alerts_today }}</p>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <p>Esta Semana</p>
            <svg class="stat-icon purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </div>
          <p class="stat-value">{{ stats.alerts_this_week }}</p>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <p>Usuarios Únicos</p>
            <svg class="stat-icon orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p class="stat-value">{{ stats.unique_users_alerted }}</p>
        </div>
      </div>

      <div class="config-card">
        <div class="card-title">
          <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.916 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.916 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <h2>Configuración del Sistema</h2>
        </div>

        <div class="config-content">
          <div class="system-state">
            <div class="state-left">
              <svg *ngIf="config.is_enabled" class="state-icon enabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
              </svg>
              <svg *ngIf="!config.is_enabled" class="state-icon disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                <path d="M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .802-3" />
                <path d="M2 2l20 20" />
                <path d="M8.668 3.01A6 6 0 0 1 18 8c0 1.916.256 3.251.654 4.272" />
              </svg>
              <div>
                <p class="state-title">Estado del Sistema</p>
                <p class="state-text">
                  {{ config.is_enabled ? 'Las alertas se enviarán automáticamente' : 'Sistema desactivado, no se enviarán alertas' }}
                </p>
              </div>
            </div>

            <button type="button" class="switch" [class.active]="config.is_enabled" (click)="handleConfigChange('is_enabled', !config.is_enabled)" aria-label="Cambiar estado del sistema">
              <span></span>
            </button>
          </div>

          <div class="fields-grid">
            <div class="field">
              <label for="threshold_amount">Umbral en Soles (S/)</label>
              <input id="threshold_amount" type="number" step="0.01" name="threshold_amount" [ngModel]="config.threshold_amount" (ngModelChange)="handleConfigChange('threshold_amount', toNumber($event))" />
              <p>Alertar cuando el saldo sea menor a este monto</p>
            </div>

            <div class="field">
              <label for="threshold_sms_count">Umbral en SMS</label>
              <input id="threshold_sms_count" type="number" name="threshold_sms_count" [ngModel]="config.threshold_sms_count" (ngModelChange)="handleConfigChange('threshold_sms_count', toInteger($event))" />
              <p>Cantidad de SMS equivalente al umbral</p>
            </div>

            <div class="field">
              <label for="cooldown_hours">Espera entre alertas (horas)</label>
              <input id="cooldown_hours" type="number" name="cooldown_hours" [ngModel]="config.cooldown_hours" (ngModelChange)="handleConfigChange('cooldown_hours', toInteger($event))" />
              <p>Tiempo mínimo entre alertas al mismo cliente</p>
            </div>

            <div class="field">
              <label>Métodos de Envío</label>
              <div class="checks">
                <label class="check-row">
                  <input type="checkbox" name="send_via_sms" [ngModel]="config.send_via_sms" (ngModelChange)="handleConfigChange('send_via_sms', $event)" />
                  <span>Enviar por SMS</span>
                </label>
                <label class="check-row">
                  <input type="checkbox" name="send_via_email" [ngModel]="config.send_via_email" (ngModelChange)="handleConfigChange('send_via_email', $event)" />
                  <span>Enviar por Email</span>
                </label>
              </div>
            </div>
          </div>

          <div class="field">
            <label for="alert_message">Mensaje de Alerta</label>
            <textarea id="alert_message" rows="4" name="alert_message" [(ngModel)]="config.alert_message"></textarea>
            <p>Variables disponibles: {{ '{name}' }}, {{ '{balance}' }}, {{ '{amount}' }}</p>
          </div>

          <div class="actions">
            <button type="button" class="cancel-button" (click)="resetConfig()">Cancelar</button>
            <button type="button" class="save-button" [disabled]="saving" (click)="saveConfig()">
              {{ saving ? 'Guardando...' : 'Guardar Configuración' }}
            </button>
          </div>
        </div>
      </div>

      <div class="history-card">
        <div class="history-header">
          <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
          </svg>
          <h2>Historial de Alertas</h2>
        </div>

        <div *ngIf="recentAlerts.length === 0" class="empty-history">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10.268 21a2 2 0 0 0 3.464 0" />
            <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
          </svg>
          <p>No hay alertas registradas</p>
        </div>

        <div *ngIf="recentAlerts.length > 0" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Contacto</th>
                <th class="right">Balance</th>
                <th class="right">Equivalente</th>
                <th class="center">Vía</th>
                <th class="center">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let alert of recentAlerts">
                <td>{{ formatDate(alert.sent_at) }}</td>
                <td>
                  <div class="client-name">{{ alert.user_name }}</div>
                  <div class="client-email">{{ alert.user_email }}</div>
                </td>
                <td>{{ alert.user_phone || '-' }}</td>
                <td class="right strong">{{ formatNumber(alert.balance_at_alert) }} SMS</td>
                <td class="right amount">{{ formatCurrency(alert.amount_equivalent) }}</td>
                <td class="center">
                  <span class="via-badge">{{ alert.sent_via }}</span>
                </td>
                <td class="center">
                  <span class="status-badge" [ngClass]="alert.delivery_status">
                    {{ deliveryStatusLabel(alert.delivery_status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .loading-state {
      align-items: center;
      display: flex;
      height: 16rem;
      justify-content: center;
    }

    .spinner {
      animation: spin 1s linear infinite;
      border-bottom: 2px solid #2563eb;
      border-radius: 9999px;
      height: 3rem;
      width: 3rem;
    }

    .alerts-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .page-header h1 {
      color: #0f172a;
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 2.25rem;
      margin: 0;
    }

    .page-header p {
      color: #475569;
      margin: 0.25rem 0 0;
    }

    .send-button {
      align-items: center;
      background: #2563eb;
      border: 0;
      border-radius: 0.5rem;
      color: #fff;
      cursor: pointer;
      display: flex;
      font: inherit;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      transition: background-color 150ms ease, opacity 150ms ease;
    }

    .send-button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .send-button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .button-icon,
    .button-spinner {
      height: 1.25rem;
      width: 1.25rem;
    }

    .button-spinner {
      animation: spin 1s linear infinite;
      border-bottom: 2px solid #fff;
      border-radius: 9999px;
      display: inline-block;
    }

    .success-box {
      align-items: center;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 0.5rem;
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
    }

    .success-box p {
      color: #166534;
      margin: 0;
    }

    .success-icon {
      color: #16a34a;
      flex: 0 0 auto;
      height: 1.25rem;
      width: 1.25rem;
    }

    .stats-grid {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .stat-card,
    .config-card,
    .history-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .stat-card {
      padding: 1.5rem;
    }

    .stat-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .stat-header p {
      color: #475569;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      margin: 0;
    }

    .stat-icon {
      height: 1.25rem;
      width: 1.25rem;
    }

    .stat-icon.blue {
      color: #2563eb;
    }

    .stat-icon.green {
      color: #16a34a;
    }

    .stat-icon.purple {
      color: #9333ea;
    }

    .stat-icon.orange {
      color: #ea580c;
    }

    .stat-value {
      color: #0f172a;
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 2.25rem;
      margin: 0;
    }

    .config-card {
      padding: 1.5rem;
    }

    .card-title,
    .history-header {
      align-items: center;
      display: flex;
      gap: 0.5rem;
    }

    .card-title {
      margin-bottom: 1.5rem;
    }

    .card-title h2,
    .history-header h2 {
      color: #0f172a;
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.75rem;
      margin: 0;
    }

    .title-icon {
      color: #475569;
      height: 1.25rem;
      width: 1.25rem;
    }

    .config-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .system-state {
      align-items: center;
      background: #f8fafc;
      border-radius: 0.5rem;
      display: flex;
      justify-content: space-between;
      padding: 1rem;
    }

    .state-left {
      align-items: center;
      display: flex;
      gap: 0.75rem;
    }

    .state-icon {
      height: 1.5rem;
      width: 1.5rem;
    }

    .state-icon.enabled {
      color: #16a34a;
    }

    .state-icon.disabled {
      color: #94a3b8;
    }

    .state-title {
      color: #0f172a;
      font-weight: 600;
      margin: 0;
    }

    .state-text {
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin: 0;
    }

    .switch {
      align-items: center;
      background: #cbd5e1;
      border: 0;
      border-radius: 9999px;
      cursor: pointer;
      display: inline-flex;
      height: 2rem;
      padding: 0;
      position: relative;
      transition: background-color 150ms ease;
      width: 3.5rem;
    }

    .switch.active {
      background: #16a34a;
    }

    .switch span {
      background: #fff;
      border-radius: 9999px;
      display: inline-block;
      height: 1.5rem;
      transform: translateX(0.25rem);
      transition: transform 150ms ease;
      width: 1.5rem;
    }

    .switch.active span {
      transform: translateX(1.75rem);
    }

    .fields-grid {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .field label {
      color: #334155;
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      margin-bottom: 0.5rem;
    }

    .field input[type='number'],
    .field textarea {
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      box-sizing: border-box;
      color: #0f172a;
      font: inherit;
      padding: 0.5rem 1rem;
      width: 100%;
    }

    .field textarea {
      resize: vertical;
    }

    .field input[type='number']:focus,
    .field textarea:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
      outline: none;
    }

    .field p {
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
      margin: 0.25rem 0 0;
    }

    .checks {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .check-row {
      align-items: center;
      display: flex;
      gap: 0.5rem;
      margin: 0;
    }

    .check-row input {
      accent-color: #2563eb;
      height: 1rem;
      width: 1rem;
    }

    .check-row span {
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .cancel-button,
    .save-button {
      border: 0;
      border-radius: 0.5rem;
      cursor: pointer;
      font: inherit;
      padding: 0.5rem 1rem;
      transition: background-color 150ms ease, opacity 150ms ease;
    }

    .cancel-button {
      background: #f1f5f9;
      color: #334155;
    }

    .cancel-button:hover {
      background: #e2e8f0;
    }

    .save-button {
      background: #2563eb;
      color: #fff;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }

    .save-button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .save-button:disabled {
      opacity: 0.5;
    }

    .history-card {
      overflow: hidden;
    }

    .history-header {
      border-bottom: 1px solid #e2e8f0;
      padding: 1rem 1.5rem;
    }

    .empty-history,
    .config-error {
      text-align: center;
    }

    .empty-history {
      padding: 3rem 0;
    }

    .config-error {
      padding: 3rem 0;
    }

    .empty-icon {
      color: #cbd5e1;
      height: 3rem;
      margin: 0 auto 1rem;
      width: 3rem;
    }

    .empty-history p,
    .config-error p {
      color: #475569;
      margin: 0;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    thead {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    th {
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      line-height: 1rem;
      padding: 0.75rem 1.5rem;
      text-align: left;
      text-transform: uppercase;
    }

    tbody {
      border-top: 1px solid #e2e8f0;
    }

    tr {
      transition: background-color 150ms ease;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    td {
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
      padding: 1rem 1.5rem;
    }

    .client-name {
      color: #0f172a;
      font-weight: 500;
    }

    .client-email {
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .right {
      text-align: right;
    }

    .center {
      text-align: center;
    }

    .strong {
      color: #0f172a;
      font-weight: 500;
    }

    .amount {
      color: #ea580c;
      font-weight: 700;
    }

    .via-badge,
    .status-badge {
      align-items: center;
      border-radius: 9999px;
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1rem;
      padding: 0.25rem 0.5rem;
    }

    .via-badge {
      background: #dbeafe;
      color: #1e40af;
      text-transform: capitalize;
    }

    .status-badge.sent {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.failed {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-badge.pending {
      background: #fef3c7;
      color: #92400e;
    }

    @media (min-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .fields-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 767px) {
      .page-header {
        align-items: stretch;
        flex-direction: column;
      }

      .send-button {
        justify-content: center;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
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

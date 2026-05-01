import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SyncConfig {
  is_active: boolean;
  corporate_api_url: string;
  sync_packages_enabled: boolean;
  sync_recharges_enabled: boolean;
  last_sync_at: string | null;
}

interface SyncLog {
  sync_type: string;
  status: string;
  records_processed: number;
  records_failed: number;
  error_message: string | null;
  created_at: string;
}

interface SyncStats {
  total_syncs_today: number;
  failed_syncs_today: number;
  packages_synced: number;
  recharges_synced: number;
  users_auto_created?: number;
}

interface AutoCreatedUser {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  sms_balance: number;
  created_at: string;
}

@Component({
  selector: 'bo-sync-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!loading" class="sync-page">
      <div class="page-header">
        <h1>Sincronización con Corporate API</h1>
        <button type="button" class="settings-button" (click)="showConfig = !showConfig">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.916 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.916 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Configuración
        </button>
      </div>

      <p *ngIf="noticeMessage" class="notice-message">{{ noticeMessage }}</p>

      <div *ngIf="showConfig" class="card config-card">
        <h2>Configuración de Sincronización</h2>
        <div class="config-stack">
          <div class="field">
            <label for="corporate_api_url">URL de Corporate SMS API</label>
            <input
              id="corporate_api_url"
              type="url"
              name="corporate_api_url"
              [(ngModel)]="editedConfig.corporate_api_url"
              placeholder="https://api.corporatesms.com"
            />
          </div>

          <div class="checks-row">
            <label class="check-row">
              <input type="checkbox" name="sync_packages_enabled" [(ngModel)]="editedConfig.sync_packages_enabled" />
              <span>Sincronizar Paquetes</span>
            </label>

            <label class="check-row">
              <input type="checkbox" name="sync_recharges_enabled" [(ngModel)]="editedConfig.sync_recharges_enabled" />
              <span>Sincronizar Recargas</span>
            </label>
          </div>

          <div class="config-actions">
            <button type="button" class="primary-button" (click)="handleSaveConfig()">Guardar Configuración</button>
            <button type="button" class="secondary-button" (click)="cancelConfig()">Cancelar</button>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="card stat-card">
          <div class="stat-header">
            <p>Estado</p>
            <svg *ngIf="config.is_active" class="stat-icon green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="m9 11 3 3L22 4" />
            </svg>
            <svg *ngIf="!config.is_active" class="stat-icon red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </div>
          <p class="stat-value">{{ config.is_active ? 'Activo' : 'Inactivo' }}</p>
        </div>

        <div class="card stat-card">
          <div class="stat-header">
            <p>Sincronizaciones Hoy</p>
            <svg class="stat-icon blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </div>
          <p class="stat-value">{{ stats.total_syncs_today }}</p>
          <p *ngIf="stats.failed_syncs_today > 0" class="failed-text">{{ stats.failed_syncs_today }} fallidas</p>
        </div>

        <div class="card stat-card">
          <div class="stat-header">
            <p>Paquetes Sincronizados</p>
            <svg class="stat-icon green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <p class="stat-value">{{ stats.packages_synced }}</p>
        </div>

        <div class="card stat-card">
          <div class="stat-header">
            <p>Recargas Sincronizadas</p>
            <svg class="stat-icon green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <p class="stat-value">{{ stats.recharges_synced }}</p>
        </div>

        <div class="card stat-card">
          <div class="stat-header">
            <p>Usuarios Auto-Creados</p>
            <svg class="stat-icon purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p class="stat-value">{{ stats.users_auto_created || 0 }}</p>
          <button *ngIf="(stats.users_auto_created || 0) > 0" type="button" class="detail-button" (click)="showAutoCreatedUsers = !showAutoCreatedUsers">
            Ver detalles
          </button>
        </div>
      </div>

      <div class="card actions-card">
        <div class="actions-header">
          <h2>Acciones de Sincronización</h2>
        </div>

        <div class="actions-grid">
          <button type="button" class="packages-action-button" [disabled]="syncing || !config.sync_packages_enabled" (click)="handleSyncPackages()">
            <svg class="button-icon" [class.spin]="syncing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            {{ syncing ? 'Sincronizando...' : 'Sincronizar Paquetes' }}
          </button>

          <button type="button" class="users-action-button" [disabled]="syncingUsers || !config.is_active" (click)="handleSyncUsers()">
            <svg class="button-icon" [class.spin]="syncingUsers" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {{ syncingUsers ? 'Sincronizando...' : 'Sincronizar Usuarios' }}
          </button>

          <div class="webhook-box">
            <div class="webhook-title">
              <svg class="button-icon muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>Webhook URL</span>
            </div>
            <code>https://supabase.example.com/functions/v1/recharge-webhook</code>
            <p>Configurar en Corporate API para recibir recargas automáticamente</p>
          </div>
        </div>

        <p *ngIf="config.last_sync_at" class="last-sync">
          Última sincronización: {{ formatDate(config.last_sync_at) }}
        </p>
      </div>

      <div *ngIf="showAutoCreatedUsers && autoCreatedUsers.length > 0" class="card auto-users-card">
        <div class="section-header">
          <h2>Usuarios Creados Automáticamente</h2>
          <button type="button" class="close-button" (click)="showAutoCreatedUsers = false" aria-label="Cerrar">
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Empresa</th>
                <th>Balance SMS</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of autoCreatedUsers">
                <td>{{ user.email }}</td>
                <td>{{ user.full_name }}</td>
                <td>{{ user.company || '-' }}</td>
                <td class="sms-cell">{{ user.sms_balance }} SMS</td>
                <td>{{ formatDate(user.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="history-card">
        <div class="history-header">
          <h2>Historial de Sincronizaciones</h2>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Procesados</th>
                <th>Fallidos</th>
                <th>Fecha</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of logs">
                <td class="type-cell">{{ getSyncTypeName(log.sync_type) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="log.status">
                    <ng-container [ngSwitch]="log.status">
                      <svg *ngSwitchCase="'success'" class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <path d="m9 11 3 3L22 4" />
                      </svg>
                      <svg *ngSwitchCase="'failed'" class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m15 9-6 6" />
                        <path d="m9 9 6 6" />
                      </svg>
                      <svg *ngSwitchDefault class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                      </svg>
                    </ng-container>
                    {{ getStatusLabel(log.status) }}
                  </span>
                </td>
                <td>{{ log.records_processed }}</td>
                <td>
                  <span *ngIf="log.records_failed > 0" class="failed-count">{{ log.records_failed }}</span>
                  <span *ngIf="log.records_failed === 0" class="zero-count">0</span>
                </td>
                <td>{{ formatDate(log.created_at) }}</td>
                <td>
                  <span *ngIf="log.error_message" class="error-text">{{ log.error_message }}</span>
                  <span *ngIf="!log.error_message" class="zero-count">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="logs.length === 0" class="empty-history">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p>No hay sincronizaciones registradas</p>
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

    .spinner,
    .spin {
      animation: spin 1s linear infinite;
    }

    .spinner {
      border-bottom: 2px solid #2563eb;
      border-radius: 9999px;
      height: 3rem;
      width: 3rem;
    }

    .sync-page {
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

    h1 {
      color: #0f172a;
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 2.25rem;
      margin: 0;
    }

    h2 {
      color: #0f172a;
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.75rem;
      margin: 0;
    }

    .settings-button,
    .primary-button,
    .secondary-button,
    .packages-action-button,
    .users-action-button {
      align-items: center;
      border: 0;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      font: inherit;
      gap: 0.5rem;
      justify-content: center;
      transition: background-color 150ms ease, opacity 150ms ease;
    }

    .settings-button {
      background: #f1f5f9;
      color: #334155;
      padding: 0.5rem 1rem;
    }

    .settings-button:hover {
      background: #e2e8f0;
    }

    .button-icon,
    .stat-icon {
      height: 1.25rem;
      width: 1.25rem;
    }

    .muted {
      color: #475569;
    }

    .notice-message {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      color: #1e40af;
      margin: 0;
      padding: 0.75rem 1rem;
    }

    .card,
    .history-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .card {
      padding: 1.5rem;
    }

    .config-card h2 {
      margin-bottom: 1rem;
    }

    .config-stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .field label {
      color: #334155;
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      margin-bottom: 0.5rem;
    }

    .field input[type='url'] {
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      box-sizing: border-box;
      color: #0f172a;
      font: inherit;
      padding: 0.5rem 1rem;
      width: 100%;
    }

    .field input[type='url']:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
      outline: none;
    }

    .checks-row {
      align-items: center;
      display: flex;
      gap: 1rem;
    }

    .check-row {
      align-items: center;
      display: flex;
      gap: 0.5rem;
    }

    .check-row input {
      accent-color: #2563eb;
      height: 1rem;
      width: 1rem;
    }

    .check-row span {
      color: #334155;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
    }

    .config-actions {
      display: flex;
      gap: 0.75rem;
    }

    .primary-button {
      background: #2563eb;
      color: #fff;
      padding: 0.5rem 1rem;
    }

    .primary-button:hover {
      background: #1d4ed8;
    }

    .secondary-button {
      background: #e2e8f0;
      color: #334155;
      padding: 0.5rem 1rem;
    }

    .secondary-button:hover {
      background: #cbd5e1;
    }

    .stats-grid {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(1, minmax(0, 1fr));
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

    .green {
      color: #16a34a;
    }

    .red {
      color: #dc2626;
    }

    .blue {
      color: #2563eb;
    }

    .purple {
      color: #9333ea;
    }

    .stat-value {
      color: #0f172a;
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 2rem;
      margin: 0;
    }

    .failed-text {
      color: #dc2626;
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin: 0.25rem 0 0;
    }

    .detail-button {
      background: transparent;
      border: 0;
      color: #2563eb;
      cursor: pointer;
      font-size: 0.75rem;
      line-height: 1rem;
      margin-top: 0.25rem;
      padding: 0;
    }

    .detail-button:hover {
      text-decoration: underline;
    }

    .actions-card {
      padding: 1.5rem;
    }

    .actions-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .actions-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .packages-action-button,
    .users-action-button {
      color: #fff;
      padding: 1rem 1.5rem;
    }

    .packages-action-button {
      background: #2563eb;
    }

    .packages-action-button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .users-action-button {
      background: #9333ea;
    }

    .users-action-button:hover:not(:disabled) {
      background: #7e22ce;
    }

    .packages-action-button:disabled,
    .users-action-button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .webhook-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
    }

    .webhook-title {
      align-items: center;
      display: flex;
      gap: 0.5rem;
    }

    .webhook-title span {
      color: #0f172a;
      font-weight: 500;
    }

    .webhook-box code {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 0.75rem;
      line-height: 1rem;
      overflow-wrap: anywhere;
      padding: 0.5rem 0.75rem;
    }

    .webhook-box p,
    .last-sync {
      color: #475569;
      font-size: 0.75rem;
      line-height: 1rem;
      margin: 0;
    }

    .last-sync {
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin-top: 1rem;
    }

    .auto-users-card {
      overflow: hidden;
      padding: 0;
    }

    .section-header,
    .history-header {
      border-bottom: 1px solid #e2e8f0;
      padding: 1rem 1.5rem;
    }

    .section-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    .close-button {
      background: transparent;
      border: 0;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
    }

    .close-button:hover {
      color: #475569;
    }

    .history-card {
      overflow: hidden;
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

    tbody tr {
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

    .sms-cell {
      color: #2563eb;
      font-weight: 500;
    }

    .type-cell {
      color: #0f172a;
      font-weight: 500;
    }

    .status-badge {
      align-items: center;
      border-radius: 9999px;
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 500;
      gap: 0.25rem;
      line-height: 1rem;
      padding: 0.125rem 0.625rem;
    }

    .status-badge.success {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.failed {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-badge.partial {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-icon {
      height: 1rem;
      width: 1rem;
    }

    .failed-count,
    .error-text {
      color: #dc2626;
      font-weight: 500;
    }

    .error-text {
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .zero-count {
      color: #94a3b8;
    }

    .empty-history {
      padding: 3rem 0;
      text-align: center;
    }

    .empty-icon {
      color: #cbd5e1;
      height: 3rem;
      margin: 0 auto 1rem;
      width: 3rem;
    }

    .empty-history p {
      color: #475569;
      margin: 0;
    }

    @media (min-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .actions-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }

    @media (max-width: 767px) {
      .page-header {
        align-items: stretch;
        flex-direction: column;
      }

      .settings-button {
        justify-content: center;
      }

      .checks-row,
      .config-actions {
        align-items: stretch;
        flex-direction: column;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class SyncPageComponent implements OnInit {
  loading = true;
  syncing = false;
  syncingUsers = false;
  showConfig = false;
  showAutoCreatedUsers = false;
  noticeMessage = '';
  logs: SyncLog[] = [];
  autoCreatedUsers: AutoCreatedUser[] = [];
  stats: SyncStats = {
    total_syncs_today: 0,
    failed_syncs_today: 0,
    packages_synced: 0,
    recharges_synced: 0,
    users_auto_created: 0,
  };
  config: SyncConfig = {
    is_active: true,
    corporate_api_url: '',
    sync_packages_enabled: true,
    sync_recharges_enabled: false,
    last_sync_at: null,
  };
  editedConfig = {
    corporate_api_url: '',
    sync_packages_enabled: true,
    sync_recharges_enabled: false,
  };

  ngOnInit(): void {
    this.logs = [];
    this.autoCreatedUsers = [];
    this.editedConfig = {
      corporate_api_url: this.config.corporate_api_url,
      sync_packages_enabled: this.config.sync_packages_enabled,
      sync_recharges_enabled: this.config.sync_recharges_enabled,
    };
    this.loading = false;
  }

  handleSaveConfig(): void {
    this.config = {
      ...this.config,
      corporate_api_url: this.editedConfig.corporate_api_url,
      sync_packages_enabled: this.editedConfig.sync_packages_enabled,
      sync_recharges_enabled: this.editedConfig.sync_recharges_enabled,
    };
    this.noticeMessage = 'La configuración segura de sincronización se conectará cuando exista backend y base de datos definidos.';
    this.showConfig = false;
  }

  cancelConfig(): void {
    this.editedConfig = {
      corporate_api_url: this.config.corporate_api_url,
      sync_packages_enabled: this.config.sync_packages_enabled,
      sync_recharges_enabled: this.config.sync_recharges_enabled,
    };
    this.showConfig = false;
  }

  handleSyncPackages(): void {
    this.syncing = true;
    this.noticeMessage = 'La sincronización segura de paquetes se conectará cuando exista backend y Edge Function definidos.';
    this.syncing = false;
  }

  handleSyncUsers(): void {
    this.syncingUsers = true;
    this.noticeMessage = 'La sincronización segura de usuarios se conectará cuando exista backend y Edge Function definidos.';
    this.syncingUsers = false;
  }

  getStatusLabel(status: string): string {
    if (status === 'success') {
      return 'Exitoso';
    }

    if (status === 'failed') {
      return 'Fallido';
    }

    return 'Parcial';
  }

  getSyncTypeName(type: string): string {
    const names: Record<string, string> = {
      packages: 'Paquetes',
      recharges: 'Recargas',
      users: 'Usuarios',
      inventory: 'Inventario',
    };
    return names[type] || type;
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
}

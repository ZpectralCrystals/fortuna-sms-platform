import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';
type StatusFilter = MessageStatus | 'all';
type DateFilter = 'all' | 'today' | 'week' | 'month';

interface BackofficeMessage {
  id: string;
  user_id: string;
  recipient: string;
  message: string;
  status: MessageStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  user: {
    full_name: string;
    email: string;
    company: string | null;
  };
}

@Component({
  selector: 'bo-messages-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="loading-text">Cargando mensajes...</div>
    </div>

    <div *ngIf="!loading" class="messages-page">
      <div class="page-header">
        <div class="title-group">
          <div class="title-icon">
            <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h1>Mensajes SMS</h1>
            <p>Historial completo de mensajes enviados</p>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-label">Total</div>
          <div class="stat-value">{{ stats.total }}</div>
        </div>
        <div class="stat-card pending">
          <div class="stat-label">Pendientes</div>
          <div class="stat-value">{{ stats.pending }}</div>
        </div>
        <div class="stat-card sent">
          <div class="stat-label">Enviados</div>
          <div class="stat-value">{{ stats.sent }}</div>
        </div>
        <div class="stat-card delivered">
          <div class="stat-label">Entregados</div>
          <div class="stat-value">{{ stats.delivered }}</div>
        </div>
        <div class="stat-card failed">
          <div class="stat-label">Fallidos</div>
          <div class="stat-value">{{ stats.failed }}</div>
        </div>
      </div>

      <div class="table-card">
        <div class="filters-panel">
          <div class="filters-row">
            <div class="search-wrapper">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                [(ngModel)]="searchTerm"
                (ngModelChange)="applyFilters()"
                placeholder="Buscar por destinatario, mensaje, cliente..."
              />
            </div>

            <div class="select-group">
              <div class="select-wrapper status-select">
                <svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="sent">Enviado</option>
                  <option value="delivered">Entregado</option>
                  <option value="failed">Fallido</option>
                </select>
              </div>

              <select class="date-select" [(ngModel)]="dateFilter" (ngModelChange)="applyFilters()">
                <option value="all">Todo el tiempo</option>
                <option value="today">Hoy</option>
                <option value="week">Última semana</option>
                <option value="month">Último mes</option>
              </select>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Destinatario</th>
                <th>Mensaje</th>
                <th>Estado</th>
                <th>Enviado</th>
                <th>Entregado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="filteredMessages.length === 0">
                <td class="empty-cell" colspan="6">No se encontraron mensajes</td>
              </tr>

              <tr *ngFor="let item of filteredMessages" class="message-row">
                <td>
                  <div class="client-name">{{ item.user.full_name }}</div>
                  <div class="client-email">{{ item.user.email }}</div>
                  <div *ngIf="item.user.company" class="client-company">{{ item.user.company }}</div>
                </td>
                <td>
                  <div class="recipient">{{ item.recipient }}</div>
                </td>
                <td>
                  <div class="message-text" [title]="item.message">{{ item.message }}</div>
                  <div *ngIf="item.error_message" class="error-text">{{ item.error_message }}</div>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="item.status">
                    <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <ng-container [ngSwitch]="item.status">
                        <ng-container *ngSwitchCase="'pending'">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </ng-container>
                        <ng-container *ngSwitchCase="'sent'">
                          <path d="m22 2-7 20-4-9-9-4Z" />
                          <path d="M22 2 11 13" />
                        </ng-container>
                        <ng-container *ngSwitchCase="'delivered'">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <path d="m9 11 3 3L22 4" />
                        </ng-container>
                        <ng-container *ngSwitchCase="'failed'">
                          <circle cx="12" cy="12" r="10" />
                          <path d="m15 9-6 6" />
                          <path d="m9 9 6 6" />
                        </ng-container>
                      </ng-container>
                    </svg>
                    {{ statusLabel(item.status) }}
                  </span>
                </td>
                <td class="date-cell">{{ formatDate(item.sent_at) }}</td>
                <td class="date-cell">{{ formatDate(item.delivered_at) }}</td>
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
      display: flex;
      align-items: center;
      justify-content: center;
      height: 16rem;
    }

    .loading-text {
      color: #475569;
    }

    .messages-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .title-icon {
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.75rem;
      color: #ffffff;
      background: linear-gradient(135deg, #a855f7, #9333ea);
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }

    .icon-lg {
      width: 1.5rem;
      height: 1.5rem;
    }

    h1 {
      margin: 0;
      color: #0f172a;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 700;
    }

    .title-group p {
      margin: 0;
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .stat-card {
      padding: 1rem;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      background: #ffffff;
    }

    .stat-label {
      margin-bottom: 0.25rem;
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .stat-value {
      color: #0f172a;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 700;
    }

    .stat-card.pending {
      background: #fefce8;
      border-color: #fde68a;
    }

    .stat-card.pending .stat-label {
      color: #a16207;
    }

    .stat-card.pending .stat-value {
      color: #713f12;
    }

    .stat-card.sent {
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    .stat-card.sent .stat-label {
      color: #1d4ed8;
    }

    .stat-card.sent .stat-value {
      color: #1e3a8a;
    }

    .stat-card.delivered {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .stat-card.delivered .stat-label {
      color: #15803d;
    }

    .stat-card.delivered .stat-value {
      color: #14532d;
    }

    .stat-card.failed {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .stat-card.failed .stat-label {
      color: #b91c1c;
    }

    .stat-card.failed .stat-value {
      color: #7f1d1d;
    }

    .table-card {
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .filters-panel {
      padding: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .filters-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .search-wrapper,
    .select-wrapper {
      position: relative;
    }

    .search-wrapper {
      flex: 1 1 auto;
    }

    .search-icon,
    .filter-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      color: #94a3b8;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .search-icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .filter-icon {
      width: 1rem;
      height: 1rem;
    }

    input,
    select {
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      background: #ffffff;
      color: #0f172a;
      font: inherit;
      outline: none;
    }

    input:focus,
    select:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #a855f7;
    }

    input {
      width: 100%;
      padding: 0.5rem 1rem 0.5rem 2.5rem;
    }

    input::placeholder {
      color: #64748b;
      opacity: 1;
    }

    .select-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    select {
      min-height: 2.625rem;
      appearance: none;
    }

    .status-select select {
      padding: 0.5rem 1rem 0.5rem 2.25rem;
    }

    .date-select {
      padding: 0.5rem 1rem;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    th {
      padding: 0.75rem 1.5rem;
      color: #334155;
      font-size: 0.75rem;
      line-height: 1rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    tbody {
      background: #ffffff;
    }

    tbody tr {
      border-bottom: 1px solid #e2e8f0;
    }

    tbody tr:last-child {
      border-bottom: 0;
    }

    .message-row {
      transition: background-color 150ms ease;
    }

    .message-row:hover {
      background: #f8fafc;
    }

    td {
      padding: 1rem 1.5rem;
      vertical-align: top;
    }

    .client-name {
      color: #0f172a;
      font-weight: 500;
    }

    .client-email {
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .client-company {
      color: #94a3b8;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .recipient {
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.875rem;
      line-height: 1.25rem;
      white-space: nowrap;
    }

    .message-text {
      max-width: 20rem;
      overflow: hidden;
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.25rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .error-text {
      margin-top: 0.25rem;
      color: #dc2626;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      line-height: 1rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .status-icon {
      width: 0.75rem;
      height: 0.75rem;
    }

    .status-badge.pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-badge.sent {
      background: #dbeafe;
      color: #1e40af;
    }

    .status-badge.delivered {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.failed {
      background: #fee2e2;
      color: #991b1b;
    }

    .date-cell {
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
      white-space: nowrap;
    }

    .empty-cell {
      padding: 3rem 1.5rem;
      color: #64748b;
      text-align: center;
    }

    @media (min-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }

    @media (min-width: 640px) {
      .filters-row {
        flex-direction: row;
      }
    }
  `]
})
export class MessagesPageComponent implements OnInit {
  messages: BackofficeMessage[] = [];
  filteredMessages: BackofficeMessage[] = [];
  loading = true;
  searchTerm = '';
  statusFilter: StatusFilter = 'all';
  dateFilter: DateFilter = 'all';

  get stats() {
    return {
      total: this.messages.length,
      pending: this.messages.filter((message) => message.status === 'pending').length,
      sent: this.messages.filter((message) => message.status === 'sent').length,
      delivered: this.messages.filter((message) => message.status === 'delivered').length,
      failed: this.messages.filter((message) => message.status === 'failed').length
    };
  }

  ngOnInit(): void {
    this.messages = [];
    this.filteredMessages = [];
    this.applyFilters();
    this.loading = false;
  }

  applyFilters(): void {
    let filtered = [...this.messages];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();

      filtered = filtered.filter((message) =>
        message.recipient.toLowerCase().includes(term) ||
        message.message.toLowerCase().includes(term) ||
        message.user.full_name.toLowerCase().includes(term) ||
        message.user.email.toLowerCase().includes(term) ||
        (message.user.company ?? '').toLowerCase().includes(term)
      );
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((message) => message.status === this.statusFilter);
    }

    if (this.dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (this.dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter((message) => new Date(message.created_at) >= filterDate);
    }

    this.filteredMessages = filtered;
  }

  statusLabel(status: MessageStatus): string {
    const labels: Record<MessageStatus, string> = {
      pending: 'Pendiente',
      sent: 'Enviado',
      delivered: 'Entregado',
      failed: 'Fallido'
    };

    return labels[status];
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}

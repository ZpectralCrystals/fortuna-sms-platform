import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '@sms-fortuna/shared';

type StatusFilter = 'all' | 'delivered' | 'sent' | 'pending' | 'failed';

interface SmsHistoryMessage {
  id: string;
  user_id: string;
  to_phone: string;
  message: string;
  status: string;
  cost: number | null;
  created_at: string;
  delivered_at: string | null;
  error_message: string | null;
}

@Component({
  selector: 'sms-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner" aria-label="Cargando"></div>
    </div>

    <div *ngIf="!loading" class="history-page">
      <header class="history-header">
        <div>
          <h1>Historial de SMS</h1>
          <p>Revisa todos los mensajes enviados</p>
        </div>
        <button type="button" class="export-button" (click)="exportToCSV()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <path d="M7 10l5 5 5-5"></path>
            <path d="M12 15V3"></path>
          </svg>
          Exportar CSV
        </button>
      </header>

      <section class="filter-card" aria-label="Filtros">
        <div class="filters-grid">
          <label class="filter-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              name="searchTerm"
              placeholder="Buscar por número o mensaje..."
              [(ngModel)]="searchTerm"
            />
          </label>

          <label class="filter-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"></path>
            </svg>
            <select name="statusFilter" [(ngModel)]="statusFilter">
              <option value="all">Todos los estados</option>
              <option value="delivered">Entregados</option>
              <option value="sent">Enviados</option>
              <option value="pending">Pendientes</option>
              <option value="failed">Fallidos</option>
            </select>
          </label>
        </div>
      </section>

      <section class="messages-card">
        <div class="messages-card__summary">
          <p>Mostrando {{ filteredMessages.length }} de {{ messages.length }} mensajes</p>
        </div>

        <div class="message-list">
          <div *ngIf="filteredMessages.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m22 2-7 20-4-9-9-4Z"></path>
              <path d="M22 2 11 13"></path>
            </svg>
            <p>No se encontraron mensajes</p>
          </div>

          <article *ngFor="let message of filteredMessages" class="message-row">
            <div class="message-row__main">
              <div class="status-icon" [ngClass]="statusIconClass(message.status)">
                <ng-container [ngSwitch]="message.status">
                  <svg *ngSwitchCase="'delivered'" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 12l2 2 4-4"></path>
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  <svg *ngSwitchCase="'failed'" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m15 9-6 6"></path>
                    <path d="m9 9 6 6"></path>
                  </svg>
                  <svg *ngSwitchCase="'sent'" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m22 2-7 20-4-9-9-4Z"></path>
                    <path d="M22 2 11 13"></path>
                  </svg>
                  <svg *ngSwitchDefault viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                </ng-container>
              </div>

              <div class="message-row__content">
                <div class="message-row__headline">
                  <span>{{ message.to_phone }}</span>
                  <strong [ngClass]="statusBadgeClass(message.status)">
                    {{ statusText(message.status) }}
                  </strong>
                </div>

                <p class="message-text">{{ message.message }}</p>

                <div class="message-meta">
                  <span>{{ formatDate(message.created_at) }}</span>
                  <span *ngIf="message.delivered_at">
                    Entregado: {{ formatTime(message.delivered_at) }}
                  </span>
                </div>

                <p *ngIf="message.error_message" class="message-error">
                  Error: {{ message.error_message }}
                </p>
              </div>
            </div>

            <div class="message-cost">
              <p>S/ {{ formatCurrency(message.cost ?? 0) }}</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    * {
      box-sizing: border-box;
    }

    svg {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 384px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 0 solid transparent;
      border-bottom: 2px solid #2563eb;
      border-radius: 999px;
      animation: spin 800ms linear infinite;
    }

    .history-page {
      display: grid;
      gap: 24px;
    }

    .history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    h1,
    p {
      margin: 0;
    }

    h1 {
      color: #111827;
      font-size: 30px;
      font-weight: 700;
      line-height: 1.2;
    }

    .history-header p {
      margin-top: 4px;
      color: #4b5563;
    }

    .export-button {
      display: inline-flex;
      align-items: center;
      border: 0;
      border-radius: 8px;
      background: #16a34a;
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      font-weight: 500;
      padding: 8px 16px;
      transition: background 160ms ease;
    }

    .export-button:hover {
      background: #15803d;
    }

    .export-button svg {
      width: 20px;
      height: 20px;
      margin-right: 8px;
    }

    .filter-card,
    .messages-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .filter-card {
      padding: 24px;
    }

    .filters-grid {
      display: grid;
      gap: 16px;
    }

    .filter-field {
      position: relative;
      display: block;
    }

    .filter-field svg {
      position: absolute;
      top: 50%;
      left: 12px;
      width: 20px;
      height: 20px;
      color: #9ca3af;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .filter-field input,
    .filter-field select {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #ffffff;
      color: #111827;
      font: inherit;
      outline: none;
      padding: 8px 16px 8px 40px;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    .filter-field select {
      appearance: none;
    }

    .filter-field input::placeholder {
      color: #6b7280;
    }

    .filter-field input:focus,
    .filter-field select:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .messages-card {
      overflow: hidden;
    }

    .messages-card__summary {
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 24px;
    }

    .messages-card__summary p {
      color: #4b5563;
      font-size: 14px;
    }

    .message-list {
      display: grid;
    }

    .empty-state {
      padding: 48px 24px;
      text-align: center;
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      color: #9ca3af;
    }

    .empty-state p {
      color: #4b5563;
    }

    .message-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      border-top: 1px solid #e5e7eb;
      padding: 16px 24px;
      transition: background 160ms ease;
    }

    .message-row:first-child {
      border-top: 0;
    }

    .message-row:hover {
      background: #f9fafb;
    }

    .message-row__main {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      min-width: 0;
      flex: 1;
    }

    .status-icon {
      width: 20px;
      height: 20px;
      margin-top: 4px;
      flex: 0 0 auto;
    }

    .status-icon--delivered {
      color: #16a34a;
    }

    .status-icon--failed {
      color: #dc2626;
    }

    .status-icon--sent {
      color: #2563eb;
    }

    .status-icon--pending {
      color: #ca8a04;
    }

    .message-row__content {
      min-width: 0;
      flex: 1;
    }

    .message-row__headline {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
      min-width: 0;
    }

    .message-row__headline span {
      overflow: hidden;
      color: #111827;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .message-row__headline strong {
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
      white-space: nowrap;
    }

    .badge--delivered {
      background: #dcfce7;
      color: #15803d;
    }

    .badge--failed {
      background: #fee2e2;
      color: #b91c1c;
    }

    .badge--sent {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .badge--pending {
      background: #fef3c7;
      color: #a16207;
    }

    .message-text {
      margin-bottom: 8px;
      color: #4b5563;
      font-size: 14px;
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      color: #6b7280;
      flex-wrap: wrap;
      font-size: 12px;
    }

    .message-error {
      margin-top: 4px;
      color: #dc2626;
      font-size: 12px;
    }

    .message-cost {
      margin-left: 16px;
      text-align: right;
      flex: 0 0 auto;
    }

    .message-cost p {
      color: #111827;
      font-size: 14px;
      font-weight: 700;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (min-width: 768px) {
      .filters-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .history-header,
      .message-row {
        align-items: stretch;
        flex-direction: column;
      }

      .export-button {
        justify-content: center;
        width: 100%;
      }

      .message-cost {
        margin-left: 36px;
        text-align: left;
      }
    }
  `]
})
export class HistoryPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  messages: SmsHistoryMessage[] = [];
  searchTerm = '';
  statusFilter: StatusFilter = 'all';
  loading = true;

  async ngOnInit(): Promise<void> {
    await this.fetchMessages();
  }

  get filteredMessages(): SmsHistoryMessage[] {
    let filtered = this.messages;

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((message) => message.status === this.statusFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter((message) =>
        message.to_phone.includes(term) ||
        message.message.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  statusText(status: string): string {
    switch (status) {
      case 'delivered':
        return 'Entregado';
      case 'failed':
        return 'Fallido';
      case 'sent':
        return 'Enviado';
      default:
        return 'Pendiente';
    }
  }

  statusIconClass(status: string): string {
    switch (status) {
      case 'delivered':
        return 'status-icon--delivered';
      case 'failed':
        return 'status-icon--failed';
      case 'sent':
        return 'status-icon--sent';
      default:
        return 'status-icon--pending';
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'delivered':
        return 'badge--delivered';
      case 'failed':
        return 'badge--failed';
      case 'sent':
        return 'badge--sent';
      default:
        return 'badge--pending';
    }
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  exportToCSV(): void {
    const headers = ['Fecha', 'Teléfono', 'Mensaje', 'Estado', 'Costo'];
    const rows = this.filteredMessages.map((message) => [
      new Date(message.created_at).toLocaleString('es-PE'),
      message.to_phone,
      message.message.replace(/,/g, ';'),
      this.statusText(message.status),
      `S/ ${this.formatCurrency(message.cost ?? 0)}`
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `historial-sms-${new Date().toISOString().split('T')[0]}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private async fetchMessages(): Promise<void> {
    try {
      const { data: sessionData } = await this.supabase.instance.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        return;
      }

      const { data } = await this.supabase.instance
        .from('sms_messages')
        .select('id, user_id, to_phone, message, status, cost, created_at, delivered_at, error_message')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      this.messages = (data as SmsHistoryMessage[] | null) ?? [];
    } catch {
      this.messages = [];
    } finally {
      this.loading = false;
    }
  }
}

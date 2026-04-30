import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from '../../../../shared/src/lib/services/supabase.service';

type RechargeStatus = 'pending' | 'approved' | 'rejected';

interface ClientRecharge {
  id: string;
  user_id: string;
  quantity: number;
  amount: number;
  status: RechargeStatus;
  created_at: string;
}

interface ClientDetails {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  razon_social: string;
  ruc: string;
  phone: string | null;
  sms_balance: number;
  is_active: boolean;
  created_at: string;
  totalRecharges: number;
  totalSpent: number;
  recentRecharges: ClientRecharge[];
}

@Component({
  selector: 'bo-accounts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!loading" class="accounts-page">
      <div class="search-box">
        <svg
          class="search-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          name="searchTerm"
          [(ngModel)]="searchTerm"
          placeholder="Buscar clientes..."
        />
      </div>

      <div class="clients-grid">
        <article
          *ngFor="let client of filteredClients"
          class="client-card"
          (click)="openClient(client)"
        >
          <div class="client-header">
            <div class="client-title">
              <h3>{{ client.full_name || '-' }}</h3>
              <p class="client-email">{{ client.email || '-' }}</p>
              <p *ngIf="client.company" class="client-company">{{ client.company }}</p>
            </div>
            <span class="status-badge" [class.active]="client.is_active" [class.inactive]="!client.is_active">
              {{ client.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>

          <div class="client-metrics">
            <div class="metric-row blue">
              <div class="metric-label">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Balance SMS</span>
              </div>
              <strong>{{ formatNumber(client.sms_balance) }}</strong>
            </div>

            <div class="metric-row green">
              <div class="metric-label">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
                <span>Total Gastado</span>
              </div>
              <strong>S/ {{ formatCurrency(client.totalSpent) }}</strong>
            </div>

            <div class="metric-row purple">
              <div class="metric-label">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
                <span>Recargas</span>
              </div>
              <strong>{{ client.totalRecharges }}</strong>
            </div>

            <div class="since-row">
              <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
              <span>Desde {{ formatDate(client.created_at) }}</span>
            </div>
          </div>
        </article>
      </div>

      <div *ngIf="filteredClients.length === 0" class="empty-state">
        <svg
          class="empty-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <p>No se encontraron clientes</p>
      </div>

      <div
        *ngIf="selectedClient"
        class="modal-backdrop"
        (click)="closeClient()"
      >
        <div
          class="client-modal"
          (click)="$event.stopPropagation()"
        >
          <div class="modal-header">
            <div>
              <h2>{{ selectedClient.full_name || '-' }}</h2>
              <p>{{ selectedClient.email || '-' }}</p>
              <p *ngIf="selectedClient.company" class="modal-company">{{ selectedClient.company }}</p>
              <p *ngIf="selectedClient.phone" class="modal-phone">{{ selectedClient.phone }}</p>
            </div>
            <button
              type="button"
              class="modal-close"
              aria-label="Cerrar"
              (click)="closeClient()"
            >
              <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div class="modal-summary-grid">
            <div class="summary-card blue">
              <svg class="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p class="summary-value">{{ formatNumber(selectedClient.sms_balance) }}</p>
              <p class="summary-label">SMS</p>
            </div>

            <div class="summary-card green">
              <svg class="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
              <p class="summary-value">S/ {{ formatCurrency(selectedClient.totalSpent) }}</p>
              <p class="summary-label">Gastado</p>
            </div>

            <div class="summary-card purple">
              <svg class="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
              <p class="summary-value">{{ selectedClient.totalRecharges }}</p>
              <p class="summary-label">Recargas</p>
            </div>
          </div>

          <section>
            <h3>Historial de Recargas</h3>
            <div class="recharge-list">
              <div
                *ngFor="let recharge of selectedClient.recentRecharges"
                class="recharge-item"
              >
                <div>
                  <p class="recharge-quantity">{{ formatNumber(recharge.quantity) }} SMS</p>
                  <p class="recharge-date">{{ formatDate(recharge.created_at) }}</p>
                </div>
                <div class="recharge-side">
                  <p>S/ {{ formatCurrency(recharge.amount) }}</p>
                  <span class="recharge-status" [ngClass]="recharge.status">
                    {{ statusLabel(recharge.status) }}
                  </span>
                </div>
              </div>

              <p *ngIf="selectedClient.recentRecharges.length === 0" class="empty-recharges">
                No hay recargas registradas
              </p>
            </div>
          </section>
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

    .spinner {
      width: 3rem;
      height: 3rem;
      border-radius: 9999px;
      border-bottom: 2px solid #2563eb;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .accounts-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      color: #0f172a;
    }

    .search-box {
      position: relative;
      max-width: 28rem;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      width: 1.25rem;
      height: 1.25rem;
      color: #94a3b8;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .search-box input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem 1rem 0.5rem 2.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      color: #0f172a;
      font: inherit;
      outline: none;
    }

    .search-box input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .search-box input::placeholder {
      color: #64748b;
      opacity: 1;
    }

    .clients-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .client-card {
      background: #ffffff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      border: 1px solid #e2e8f0;
      padding: 1.5rem;
      cursor: pointer;
      transition: box-shadow 150ms ease;
    }

    .client-card:hover {
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }

    .client-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .client-title {
      flex: 1;
      min-width: 0;
    }

    .client-title h3 {
      margin: 0 0 0.25rem;
      color: #0f172a;
      font-size: 1.125rem;
      line-height: 1.75rem;
      font-weight: 700;
    }

    .client-email {
      margin: 0;
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
      overflow-wrap: anywhere;
    }

    .client-company {
      margin: 0.25rem 0 0;
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
    }

    .status-badge {
      flex: 0 0 auto;
      padding: 0.125rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      line-height: 1rem;
      font-weight: 500;
    }

    .status-badge.active {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .client-metrics {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .metric-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
    }

    .metric-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .metric-label span {
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
    }

    .metric-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 auto;
    }

    .metric-row strong {
      font-size: 1.125rem;
      line-height: 1.75rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .metric-row.blue,
    .summary-card.blue {
      background: #eff6ff;
      color: #2563eb;
    }

    .metric-row.green,
    .summary-card.green {
      background: #f0fdf4;
      color: #16a34a;
    }

    .metric-row.purple,
    .summary-card.purple {
      background: #faf5ff;
      color: #9333ea;
    }

    .since-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.5rem;
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .calendar-icon {
      width: 1rem;
      height: 1rem;
      flex: 0 0 auto;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 0;
    }

    .empty-icon {
      width: 3rem;
      height: 3rem;
      color: #cbd5e1;
      margin: 0 auto 1rem;
    }

    .empty-state p {
      margin: 0;
      color: #475569;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgb(0 0 0 / 0.5);
      padding: 1rem;
    }

    .client-modal {
      width: 100%;
      max-width: 42rem;
      max-height: 90vh;
      overflow-y: auto;
      background: #ffffff;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .modal-header h2 {
      margin: 0 0 0.5rem;
      color: #0f172a;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 700;
    }

    .modal-header p {
      margin: 0;
      color: #475569;
    }

    .modal-header .modal-company {
      color: #334155;
      font-weight: 500;
      margin-top: 0.25rem;
    }

    .modal-header .modal-phone {
      color: #475569;
      margin-top: 0.25rem;
    }

    .modal-close {
      border: 0;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
    }

    .modal-close:hover {
      color: #475569;
    }

    .close-icon {
      width: 1.5rem;
      height: 1.5rem;
    }

    .modal-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .summary-card {
      border-radius: 0.5rem;
      padding: 1rem;
      text-align: center;
    }

    .summary-icon {
      width: 1.5rem;
      height: 1.5rem;
      margin: 0 auto 0.5rem;
    }

    .summary-value {
      margin: 0;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 700;
    }

    .summary-label {
      margin: 0;
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    section h3 {
      margin: 0 0 1rem;
      color: #0f172a;
      font-size: 1.125rem;
      line-height: 1.75rem;
      font-weight: 700;
    }

    .recharge-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .recharge-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 0.5rem;
    }

    .recharge-quantity {
      margin: 0;
      color: #0f172a;
      font-weight: 500;
    }

    .recharge-date {
      margin: 0;
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .recharge-side {
      text-align: right;
    }

    .recharge-side p {
      margin: 0 0 0.25rem;
      color: #0f172a;
      font-weight: 600;
    }

    .recharge-status {
      display: inline-flex;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .recharge-status.approved {
      background: #dcfce7;
      color: #166534;
    }

    .recharge-status.pending {
      background: #fef3c7;
      color: #92400e;
    }

    .recharge-status.rejected {
      background: #fee2e2;
      color: #991b1b;
    }

    .empty-recharges {
      text-align: center;
      color: #64748b;
      padding: 1rem 0;
    }

    @media (min-width: 1024px) {
      .clients-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1280px) {
      .clients-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .modal-summary-grid {
        grid-template-columns: 1fr;
      }

      .recharge-item {
        align-items: flex-start;
        flex-direction: column;
      }

      .recharge-side {
        text-align: left;
      }
    }
  `]
})
export class AccountsPageComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  clients: ClientDetails[] = [];
  loading = true;
  searchTerm = '';
  selectedClient: ClientDetails | null = null;

  get filteredClients(): ClientDetails[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.clients;
    }

    return this.clients.filter((client) =>
      (client.full_name ?? '').toLowerCase().includes(search) ||
      (client.email ?? '').toLowerCase().includes(search) ||
      (client.razon_social ?? '').toLowerCase().includes(search) ||
      (client.ruc ?? '').toLowerCase().includes(search) ||
      (client.company ?? '').toLowerCase().includes(search)
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadClients();
  }

  async loadClients(): Promise<void> {
    this.loading = true;

    try {
      const profiles = await this.loadProfiles();
      const adminIds = await this.loadAdminIds();
      const currentUserId = await this.getCurrentUserId();

      this.clients = profiles
        .filter((profile) => {
          const isAdminByTable = adminIds.has(profile.id);
          const isCurrentAdmin = currentUserId ? profile.id === currentUserId : false;

          return !isAdminByTable && !isCurrentAdmin;
        })
        .map((profile) => ({
          ...profile,
          totalRecharges: 0,
          totalSpent: profile.totalSpent,
          recentRecharges: []
        }));
    } catch (error) {
      console.warn('Error loading clients:', error);
      this.clients = [];
    } finally {
      this.loading = false;
    }
  }

  openClient(client: ClientDetails): void {
    this.selectedClient = client;
  }

  closeClient(): void {
    this.selectedClient = null;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  statusLabel(status: RechargeStatus): string {
    const labels: Record<RechargeStatus, string> = {
      approved: 'Aprobado',
      pending: 'Pendiente',
      rejected: 'Rechazado'
    };

    return labels[status];
  }

  private async loadProfiles(): Promise<Omit<ClientDetails, 'totalRecharges' | 'recentRecharges'>[]> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('profiles')
        .select('id,email,full_name,razon_social,ruc,phone,role,is_active,credits,total_spent,created_at,updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((profile: any) => {
        const email = this.toSafeString(profile.email);
        const fullName = this.toSafeString(profile.full_name) || email;
        const razonSocial = this.toSafeString(profile.razon_social);
        const ruc = this.toSafeString(profile.ruc);
        const company = razonSocial || ruc || '-';

        return {
          id: String(profile.id ?? ''),
          email,
          full_name: fullName,
          razon_social: razonSocial,
          ruc,
          company,
          phone: this.toNullableString(profile.phone),
          sms_balance: Number(profile.credits ?? 0),
          is_active: profile.is_active ?? true,
          created_at: typeof profile.created_at === 'string' ? profile.created_at : new Date().toISOString(),
          totalSpent: Number(profile.total_spent ?? 0)
        };
      });
    } catch (error) {
      console.warn('Error loading account profiles:', error);
      return [];
    }
  }

  private async loadAdminIds(): Promise<Set<string>> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('admins')
        .select('id');

      if (error) {
        throw error;
      }

      return new Set((data ?? []).map((admin: any) => String(admin.id ?? '')).filter(Boolean));
    } catch (error) {
      console.warn('Error loading account admins:', error);
      return new Set();
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data, error } = await this.supabaseService.instance.auth.getSession();

      if (error) {
        throw error;
      }

      return data.session?.user?.id ?? null;
    } catch (error) {
      console.warn('Error loading current account user:', error);
      return null;
    }
  }

  private toSafeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}

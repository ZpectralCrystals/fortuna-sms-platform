import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Invoice {
  recharge_id: string;
  invoice_date: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_company: string | null;
  package_name: string;
  quantity: number;
  amount: number;
  payment_method: string;
  operation_code: string | null;
  external_payment_id: string | null;
  approved_at: string;
  approved_by_name: string | null;
  year: number;
  month: number;
  month_name: string;
}

interface MonthOption {
  value: number;
  name: string;
}

@Component({
  selector: 'bo-invoices-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!loading" class="invoices-page">
      <div class="page-header">
        <div>
          <h1>Facturas</h1>
          <p>Recargas aprobadas y generación de reportes</p>
        </div>
        <button type="button" class="export-button" [disabled]="invoices.length === 0" (click)="exportToCSV()">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 15V3" />
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
          </svg>
          Exportar CSV
        </button>
      </div>

      <p *ngIf="noticeMessage" class="notice-message">{{ noticeMessage }}</p>

      <div class="filters-card">
        <div class="filters-title">
          <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
          </svg>
          <h2>Filtros</h2>
        </div>

        <div class="filters-grid">
          <div class="field">
            <label for="selectedYear">Año</label>
            <select id="selectedYear" name="selectedYear" [(ngModel)]="selectedYear">
              <option *ngFor="let year of availableYears" [ngValue]="year">{{ year }}</option>
            </select>
          </div>

          <div class="field">
            <label for="selectedMonth">Mes</label>
            <select id="selectedMonth" name="selectedMonth" [(ngModel)]="selectedMonth">
              <option [ngValue]="null">Todos los meses</option>
              <option *ngFor="let month of months" [ngValue]="month.value">{{ month.name }}</option>
            </select>
          </div>

          <div class="filter-action">
            <button type="button" class="clear-button" (click)="clearFilters()">Limpiar Filtros</button>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <p>Total Facturas</p>
            <svg class="stat-icon blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M10 9H8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
            </svg>
          </div>
          <p class="stat-value">{{ invoices.length }}</p>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <p>Total SMS Vendidos</p>
            <svg class="stat-icon green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <p class="stat-value">{{ formatNumber(getTotalQuantity()) }}</p>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <p>Ingresos Totales</p>
            <span class="money-icon">💰</span>
          </div>
          <p class="stat-value revenue">{{ formatCurrency(getTotalRevenue()) }}</p>
        </div>
      </div>

      <div class="list-card">
        <div class="list-header">
          <h2>
            Listado de Facturas
            <span *ngIf="selectedMonth" class="period-label">- {{ selectedMonthName }} {{ selectedYear }}</span>
            <span *ngIf="!selectedMonth" class="period-label">- {{ selectedYear }}</span>
          </h2>
        </div>

        <div *ngIf="invoices.length === 0" class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
          </svg>
          <p>No hay facturas para el período seleccionado</p>
        </div>

        <div *ngIf="invoices.length > 0" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Empresa</th>
                <th>Paquete</th>
                <th class="right">SMS</th>
                <th class="right">Monto</th>
                <th>Método</th>
                <th>Código Op.</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let invoice of invoices">
                <td>{{ formatDate(invoice.invoice_date) }}</td>
                <td>
                  <div class="client-name">{{ invoice.user_name }}</div>
                  <div class="client-email">{{ invoice.user_email }}</div>
                </td>
                <td>{{ invoice.user_company || '-' }}</td>
                <td class="package-cell">{{ invoice.package_name }}</td>
                <td class="right strong">{{ formatNumber(invoice.quantity) }}</td>
                <td class="right amount">{{ formatCurrency(invoice.amount) }}</td>
                <td class="method-cell">{{ invoice.payment_method }}</td>
                <td class="operation-cell">{{ invoice.operation_code || '-' }}</td>
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

    .invoices-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      align-items: center;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
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

    .export-button {
      align-items: center;
      background: #16a34a;
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

    .export-button:hover:not(:disabled) {
      background: #15803d;
    }

    .export-button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .button-icon,
    .title-icon,
    .stat-icon {
      height: 1.25rem;
      width: 1.25rem;
    }

    .notice-message {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      color: #1e40af;
      margin: 0;
      padding: 0.75rem 1rem;
    }

    .filters-card,
    .stat-card,
    .list-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .filters-card {
      padding: 1.5rem;
    }

    .filters-title {
      align-items: center;
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .filters-title h2 {
      color: #0f172a;
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.75rem;
      margin: 0;
    }

    .title-icon {
      color: #475569;
    }

    .filters-grid {
      display: grid;
      gap: 1rem;
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

    .field select {
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      box-sizing: border-box;
      color: #0f172a;
      font: inherit;
      padding: 0.5rem 1rem;
      width: 100%;
    }

    .field select:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
      outline: none;
    }

    .filter-action {
      align-items: flex-end;
      display: flex;
    }

    .clear-button {
      background: #f1f5f9;
      border: 0;
      border-radius: 0.5rem;
      color: #334155;
      cursor: pointer;
      font: inherit;
      padding: 0.5rem 1rem;
      transition: background-color 150ms ease;
      width: 100%;
    }

    .clear-button:hover {
      background: #e2e8f0;
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

    .stat-icon.blue {
      color: #2563eb;
    }

    .stat-icon.green {
      color: #16a34a;
    }

    .money-icon {
      font-size: 1.5rem;
      line-height: 2rem;
    }

    .stat-value {
      color: #0f172a;
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 2.25rem;
      margin: 0;
    }

    .stat-value.revenue {
      color: #16a34a;
    }

    .list-card {
      overflow: hidden;
    }

    .list-header {
      border-bottom: 1px solid #e2e8f0;
      padding: 1rem 1.5rem;
    }

    .list-header h2 {
      color: #0f172a;
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.75rem;
      margin: 0;
    }

    .period-label {
      color: #475569;
      font-weight: 400;
      margin-left: 0.5rem;
    }

    .empty-state {
      padding: 3rem 0;
      text-align: center;
    }

    .empty-icon {
      color: #cbd5e1;
      height: 3rem;
      margin: 0 auto 1rem;
      width: 3rem;
    }

    .empty-state p {
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

    .client-name,
    .package-cell,
    .strong {
      color: #0f172a;
    }

    .client-name,
    .strong {
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

    .amount {
      color: #16a34a;
      font-weight: 700;
    }

    .method-cell {
      text-transform: capitalize;
    }

    .operation-cell {
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    @media (min-width: 768px) {
      .filters-grid,
      .stats-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 767px) {
      .page-header {
        align-items: stretch;
        flex-direction: column;
      }

      .export-button {
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
export class InvoicesPageComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = true;
  selectedYear = new Date().getFullYear();
  selectedMonth: number | null = null;
  availableYears: number[] = [this.selectedYear];
  noticeMessage = '';

  readonly months: MonthOption[] = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' },
  ];

  ngOnInit(): void {
    this.invoices = [];
    this.loading = false;
  }

  get selectedMonthName(): string {
    return this.months.find((month) => month.value === this.selectedMonth)?.name ?? '';
  }

  clearFilters(): void {
    this.selectedMonth = null;
    this.selectedYear = new Date().getFullYear();
  }

  getTotalRevenue(): number {
    return this.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  }

  getTotalQuantity(): number {
    return this.invoices.reduce((sum, invoice) => sum + invoice.quantity, 0);
  }

  exportToCSV(): void {
    this.noticeMessage = 'La exportación segura de facturas se conectará cuando exista backend y base de datos definidos.';
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
}

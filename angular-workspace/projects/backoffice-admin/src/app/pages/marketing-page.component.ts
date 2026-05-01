import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

interface MarketingStats {
  current_month: {
    revenue: number;
    month_name: string;
    year: number;
  };
  last_month: {
    revenue: number;
    month_name: string;
    year: number;
  };
  growth: {
    amount: number;
    percentage: number;
    is_growing: boolean;
  };
  customers: {
    total: number;
    active: number;
    new_this_month: number;
    retention_rate: number;
  };
  avg_recharge_amount: number;
}

interface RevenueTrend {
  year: number;
  month: number;
  month_name: string;
  revenue: number;
  recharges_count: number;
  unique_customers: number;
  avg_recharge_value: number;
}

interface CustomerAcquisition {
  year: number;
  month: number;
  month_name: string;
  new_customers: number;
  repeat_customers: number;
  total_revenue: number;
  revenue_from_new: number;
  revenue_from_repeat: number;
}

interface TopCustomer {
  user_id: string;
  full_name: string;
  email: string;
  company: string | null;
  total_revenue: number;
  total_recharges: number;
  avg_recharge_amount: number;
  last_recharge_date: string;
  sms_balance: number;
}

@Component({
  selector: 'bo-marketing-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!loading && !stats" class="stats-error">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <p>No se pudieron cargar las estadísticas</p>
    </div>

    <div *ngIf="!loading && stats" class="marketing-page">
      <div>
        <h1>Marketing & Análisis</h1>
        <p class="subtitle">Decisiones basadas en datos para impulsar tu negocio</p>
      </div>

      <div class="kpi-grid">
        <div class="card kpi-card">
          <div class="kpi-header">
            <p>Ingresos Este Mes</p>
            <svg class="kpi-icon green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" x2="12" y1="2" y2="22" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <p class="kpi-value revenue">{{ formatCurrency(stats.current_month.revenue) }}</p>
          <p class="kpi-help">{{ stats.current_month.month_name }}</p>
        </div>

        <div class="card kpi-card">
          <div class="kpi-header">
            <p>Crecimiento</p>
            <svg *ngIf="stats.growth.is_growing" class="kpi-icon green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <svg *ngIf="!stats.growth.is_growing" class="kpi-icon red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
              <polyline points="16 17 22 17 22 11" />
            </svg>
          </div>
          <p class="kpi-value" [class.revenue]="stats.growth.is_growing" [class.negative]="!stats.growth.is_growing">
            {{ stats.growth.is_growing ? '+' : '' }}{{ stats.growth.percentage.toFixed(1) }}%
          </p>
          <p class="kpi-help">vs. mes anterior</p>
        </div>

        <div class="card kpi-card">
          <div class="kpi-header">
            <p>Clientes Activos</p>
            <svg class="kpi-icon blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p class="kpi-value">{{ stats.customers.active }}</p>
          <p class="kpi-help">de {{ stats.customers.total }} totales</p>
        </div>

        <div class="card kpi-card">
          <div class="kpi-header">
            <p>Ticket Promedio</p>
            <svg class="kpi-icon purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </div>
          <p class="kpi-value">{{ formatCurrency(stats.avg_recharge_amount) }}</p>
          <p class="kpi-help">por recarga</p>
        </div>
      </div>

      <div class="card recommendations-card">
        <h2>Recomendaciones de Marketing</h2>
        <div class="recommendations-list">
          <div class="recommendation">
            <div class="recommendation-inner">
              <svg class="recommendation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
                <circle cx="12" cy="8" r="6" />
              </svg>
              <div>
                <h3>Todo Marcha Bien</h3>
                <p>Tu negocio está funcionando correctamente. Continúa con tu estrategia actual y monitorea las métricas regularmente.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card trend-card">
        <h2>Tendencia de Ingresos (Últimos 12 Meses)</h2>
        <div class="chart-area">
          <div *ngFor="let trend of revenueTrends" class="bar-column">
            <div class="bar-track">
              <div class="bar" [style.height.%]="getRevenueBarHeight(trend.revenue)">
                <div class="tooltip">
                  <div class="tooltip-title">{{ formatCurrency(trend.revenue) }}</div>
                  <div>{{ trend.recharges_count }} recargas</div>
                  <div>{{ trend.unique_customers }} clientes</div>
                </div>
              </div>
            </div>
            <div class="bar-month">{{ trend.month_name }}</div>
            <div class="bar-year">{{ trend.year }}</div>
          </div>
        </div>
      </div>

      <div class="lower-grid">
        <div class="card table-card">
          <h2>Adquisición de Clientes</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Período</th>
                  <th class="right">Nuevos</th>
                  <th class="right">Recurrentes</th>
                  <th class="right">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of acquisitionStats">
                  <td>{{ item.month_name }} {{ item.year }}</td>
                  <td class="right new-customers">{{ item.new_customers }}</td>
                  <td class="right repeat-customers">{{ item.repeat_customers }}</td>
                  <td class="right total-revenue">{{ formatCurrency(item.total_revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card top-card">
          <h2>Top 5 Clientes</h2>
          <div class="top-list">
            <div *ngFor="let customer of topCustomers; let index = index" class="top-item">
              <div class="rank">{{ index + 1 }}</div>
              <div class="customer-main">
                <p class="customer-name">{{ customer.full_name }}</p>
                <p class="customer-email">{{ customer.email }}</p>
                <p *ngIf="customer.company" class="customer-company">{{ customer.company }}</p>
              </div>
              <div class="customer-revenue">
                <p>{{ formatCurrency(customer.total_revenue) }}</p>
                <span>{{ customer.total_recharges }} recargas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="business-card">
        <h2>Métricas Clave del Negocio</h2>
        <div class="business-grid">
          <div class="business-metric">
            <p>Tasa de Retención</p>
            <strong>{{ stats.customers.retention_rate.toFixed(1) }}%</strong>
            <span>{{ stats.customers.active }} de {{ stats.customers.total }} activos</span>
          </div>
          <div class="business-metric">
            <p>Nuevos Clientes</p>
            <strong class="green">{{ stats.customers.new_this_month }}</strong>
            <span>este mes</span>
          </div>
          <div class="business-metric">
            <p>Diferencia</p>
            <strong [class.green]="stats.growth.amount >= 0" [class.red]="stats.growth.amount < 0">
              {{ stats.growth.amount >= 0 ? '+' : '' }}{{ formatCurrency(stats.growth.amount) }}
            </strong>
            <span>vs. mes anterior</span>
          </div>
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

    .stats-error {
      padding: 3rem 0;
      text-align: center;
    }

    .empty-icon {
      color: #cbd5e1;
      height: 3rem;
      margin: 0 auto 1rem;
      width: 3rem;
    }

    .stats-error p {
      color: #475569;
      margin: 0;
    }

    .marketing-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    h1 {
      color: #0f172a;
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 2.25rem;
      margin: 0;
    }

    .subtitle {
      color: #475569;
      margin: 0.25rem 0 0;
    }

    .kpi-grid,
    .lower-grid,
    .business-grid {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      padding: 1.5rem;
    }

    .kpi-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .kpi-header p {
      color: #475569;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      margin: 0;
    }

    .kpi-icon {
      height: 1.25rem;
      width: 1.25rem;
    }

    .green {
      color: #16a34a;
    }

    .blue {
      color: #2563eb;
    }

    .purple {
      color: #9333ea;
    }

    .red,
    .negative {
      color: #dc2626;
    }

    .kpi-value {
      color: #0f172a;
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 2.25rem;
      margin: 0;
    }

    .kpi-value.revenue {
      color: #16a34a;
    }

    .kpi-help {
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
      margin: 0.25rem 0 0;
    }

    h2 {
      color: #0f172a;
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.75rem;
      margin: 0 0 1rem;
    }

    .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .recommendation {
      background: #f0fdf4;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .recommendation-inner {
      align-items: flex-start;
      display: flex;
      gap: 0.75rem;
    }

    .recommendation-icon {
      color: #16a34a;
      flex: 0 0 auto;
      height: 1.5rem;
      margin-top: 0.125rem;
      width: 1.5rem;
    }

    .recommendation h3 {
      color: #16a34a;
      font-weight: 600;
      margin: 0 0 0.25rem;
    }

    .recommendation p {
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin: 0;
    }

    .trend-card h2,
    .table-card h2,
    .top-card h2,
    .business-card h2 {
      margin-bottom: 1.5rem;
    }

    .chart-area {
      align-items: flex-end;
      display: flex;
      gap: 0.5rem;
      height: 16rem;
      justify-content: space-between;
    }

    .bar-column {
      align-items: center;
      display: flex;
      flex: 1;
      flex-direction: column;
    }

    .bar-track {
      align-items: flex-end;
      display: flex;
      height: 12rem;
      justify-content: center;
      width: 100%;
    }

    .bar {
      background: linear-gradient(to top, #2563eb, #60a5fa);
      border-radius: 0.5rem 0.5rem 0 0;
      cursor: pointer;
      position: relative;
      transition: background 150ms ease;
      width: 100%;
    }

    .bar:hover {
      background: linear-gradient(to top, #1d4ed8, #3b82f6);
    }

    .tooltip {
      background: #0f172a;
      border-radius: 0.5rem;
      color: #cbd5e1;
      font-size: 0.75rem;
      left: 50%;
      line-height: 1rem;
      opacity: 0;
      padding: 0.5rem 0.75rem;
      position: absolute;
      top: -4rem;
      transform: translateX(-50%);
      transition: opacity 150ms ease;
      white-space: nowrap;
      z-index: 10;
    }

    .bar:hover .tooltip {
      opacity: 1;
    }

    .tooltip-title {
      color: #fff;
      font-weight: 700;
    }

    .bar-month {
      color: #475569;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1rem;
      margin-top: 0.5rem;
    }

    .bar-year {
      color: #94a3b8;
      font-size: 0.75rem;
      line-height: 1rem;
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
    }

    th {
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1rem;
      padding: 0.5rem 1rem;
      text-align: left;
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
      color: #0f172a;
      font-size: 0.875rem;
      line-height: 1.25rem;
      padding: 0.75rem 1rem;
    }

    .right {
      text-align: right;
    }

    .new-customers {
      color: #2563eb;
      font-weight: 500;
    }

    .repeat-customers {
      color: #16a34a;
      font-weight: 500;
    }

    .total-revenue {
      font-weight: 700;
    }

    .top-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .top-item {
      align-items: center;
      background: #f8fafc;
      border-radius: 0.5rem;
      display: flex;
      gap: 1rem;
      padding: 1rem;
      transition: background-color 150ms ease;
    }

    .top-item:hover {
      background: #f1f5f9;
    }

    .rank {
      align-items: center;
      background: linear-gradient(to bottom right, #2563eb, #9333ea);
      border-radius: 9999px;
      color: #fff;
      display: flex;
      flex: 0 0 auto;
      font-weight: 700;
      height: 2.5rem;
      justify-content: center;
      width: 2.5rem;
    }

    .customer-main {
      flex: 1 1 auto;
      min-width: 0;
    }

    .customer-name {
      color: #0f172a;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.25rem;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .customer-email {
      color: #475569;
      font-size: 0.75rem;
      line-height: 1rem;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .customer-company {
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
      margin: 0;
    }

    .customer-revenue {
      text-align: right;
    }

    .customer-revenue p {
      color: #16a34a;
      font-size: 1.125rem;
      font-weight: 700;
      line-height: 1.75rem;
      margin: 0;
    }

    .customer-revenue span {
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .business-card {
      background: linear-gradient(to bottom right, #eff6ff, #faf5ff);
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      padding: 1.5rem;
    }

    .business-metric {
      background: #fff;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .business-metric p {
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin: 0 0 0.25rem;
    }

    .business-metric strong {
      color: #2563eb;
      display: block;
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 2.25rem;
    }

    .business-metric span {
      color: #64748b;
      display: block;
      font-size: 0.75rem;
      line-height: 1rem;
      margin-top: 0.25rem;
    }

    @media (min-width: 768px) {
      .kpi-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .business-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .kpi-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .lower-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class MarketingPageComponent implements OnInit {
  loading = true;
  stats: MarketingStats | null = null;
  revenueTrends: RevenueTrend[] = [];
  acquisitionStats: CustomerAcquisition[] = [];
  topCustomers: TopCustomer[] = [];

  ngOnInit(): void {
    const now = new Date();
    this.stats = {
      current_month: {
        revenue: 0,
        month_name: this.monthName(now),
        year: now.getFullYear(),
      },
      last_month: {
        revenue: 0,
        month_name: this.monthName(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        year: new Date(now.getFullYear(), now.getMonth() - 1, 1).getFullYear(),
      },
      growth: {
        amount: 0,
        percentage: 0,
        is_growing: true,
      },
      customers: {
        total: 0,
        active: 0,
        new_this_month: 0,
        retention_rate: 0,
      },
      avg_recharge_amount: 0,
    };
    this.revenueTrends = [];
    this.acquisitionStats = [];
    this.topCustomers = [];
    this.loading = false;
  }

  getMaxRevenue(): number {
    if (this.revenueTrends.length === 0) {
      return 0;
    }

    return Math.max(...this.revenueTrends.map((trend) => Number(trend.revenue)));
  }

  getRevenueBarHeight(revenue: number): number {
    const max = this.getMaxRevenue();
    if (max === 0) {
      return 0;
    }

    return (Number(revenue) / max) * 100;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value || 0);
  }

  private monthName(date: Date): string {
    const month = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(date);
    return month.charAt(0).toUpperCase() + month.slice(1);
  }
}

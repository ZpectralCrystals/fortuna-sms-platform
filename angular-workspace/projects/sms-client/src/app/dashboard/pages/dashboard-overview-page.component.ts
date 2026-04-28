import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '@sms-fortuna/shared';

interface DashboardProfile {
  id: string;
  full_name: string | null;
  credits: number | null;
}

interface SmsMessage {
  id: string;
  to_phone: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | string;
  cost: number | null;
  created_at: string;
}

interface DashboardStats {
  totalSent: number;
  delivered: number;
  failed: number;
  pending: number;
}

interface ChartPoint {
  date: string;
  enviados: number;
  entregados: number;
}

interface StatCard {
  name: string;
  value: string;
  icon: 'send' | 'check' | 'x' | 'credit';
  colorClass: string;
  change?: string;
  percentage?: string;
  subtitle?: string;
}

@Component({
  selector: 'sms-dashboard-overview-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner" aria-label="Cargando"></div>
    </div>

    <div *ngIf="!loading" class="dashboard-page">
      <header class="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido, {{ profile?.full_name }}</p>
        </div>
        <a routerLink="/dashboard/send" class="primary-action">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4Z"></path>
            <path d="M22 2 11 13"></path>
          </svg>
          Enviar SMS
        </a>
      </header>

      <section class="stats-grid" aria-label="Indicadores">
        <article *ngFor="let stat of statCards" class="stat-card">
          <div class="stat-card__top">
            <div class="stat-card__icon" [ngClass]="stat.colorClass">
              <ng-container [ngSwitch]="stat.icon">
                <svg *ngSwitchCase="'send'" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m22 2-7 20-4-9-9-4Z"></path>
                  <path d="M22 2 11 13"></path>
                </svg>
                <svg *ngSwitchCase="'check'" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 12l2 2 4-4"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                <svg *ngSwitchCase="'x'" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="m15 9-6 6"></path>
                  <path d="m9 9 6 6"></path>
                </svg>
                <svg *ngSwitchCase="'credit'" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <path d="M2 10h20"></path>
                </svg>
              </ng-container>
            </div>
            <span *ngIf="stat.change" class="stat-card__change">{{ stat.change }}</span>
          </div>
          <p class="stat-card__label">{{ stat.name }}</p>
          <p class="stat-card__value">{{ stat.value }}</p>
          <p *ngIf="stat.percentage" class="stat-card__meta">{{ stat.percentage }} del total</p>
          <p *ngIf="stat.subtitle" class="stat-card__meta">{{ stat.subtitle }}</p>
        </article>
      </section>

      <section class="charts-grid" aria-label="Gráficos">
        <article class="chart-card">
          <h2>SMS por día (últimos 7 días)</h2>
          <div class="bar-chart" role="img" aria-label="SMS enviados y entregados por día">
            <div class="chart-gridlines" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div class="bar-chart__plot">
              <div *ngFor="let point of chartData" class="bar-group">
                <div class="bar-group__bars">
                  <span class="bar bar--sent" [style.height.%]="barHeight(point.enviados)"></span>
                  <span class="bar bar--delivered" [style.height.%]="barHeight(point.entregados)"></span>
                </div>
                <span class="bar-group__label">{{ point.date }}</span>
              </div>
            </div>
          </div>
          <div class="chart-legend">
            <span><i class="legend-dot legend-dot--sent"></i>Enviados</span>
            <span><i class="legend-dot legend-dot--delivered"></i>Entregados</span>
          </div>
        </article>

        <article class="chart-card">
          <h2>Tasa de entrega</h2>
          <div class="line-chart" role="img" aria-label="Tasa de entrega últimos 7 días">
            <svg viewBox="0 0 320 260" preserveAspectRatio="none" aria-hidden="true">
              <path d="M20 30 H300 M20 90 H300 M20 150 H300 M20 210 H300"></path>
              <polyline [attr.points]="linePoints"></polyline>
            </svg>
            <div class="line-chart__labels">
              <span *ngFor="let point of chartData">{{ point.date }}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="recent-card">
        <div class="recent-card__header">
          <h2>Mensajes recientes</h2>
          <a routerLink="/dashboard/history">
            Ver todos
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </a>
        </div>

        <div class="recent-card__body">
          <div *ngIf="recentMessages.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
            </svg>
            <p>Aún no has enviado ningún SMS</p>
            <a routerLink="/dashboard/send">Enviar tu primer SMS</a>
          </div>

          <article *ngFor="let message of recentMessages" class="message-row">
            <div class="message-row__content">
              <div class="message-row__headline">
                <span>{{ message.to_phone }}</span>
                <strong [ngClass]="statusClass(message.status)">{{ statusLabel(message.status) }}</strong>
              </div>
              <p>{{ message.message }}</p>
            </div>
            <div class="message-row__meta">
              <div>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                {{ formatDate(message.created_at) }}
              </div>
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

    a {
      color: inherit;
      text-decoration: none;
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

    .dashboard-page {
      display: grid;
      gap: 24px;
    }

    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .dashboard-header h1 {
      margin: 0;
      color: #111827;
      font-size: 30px;
      line-height: 1.2;
      font-weight: 700;
    }

    .dashboard-header p {
      margin: 4px 0 0;
      color: #4b5563;
    }

    .primary-action {
      display: inline-flex;
      align-items: center;
      border-radius: 8px;
      background: #2563eb;
      color: #ffffff;
      padding: 8px 16px;
      font-weight: 500;
      transition: background 160ms ease;
    }

    .primary-action:hover {
      background: #1d4ed8;
    }

    .primary-action svg {
      width: 20px;
      height: 20px;
      margin-right: 8px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
      gap: 24px;
    }

    .stat-card,
    .chart-card,
    .recent-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .stat-card {
      padding: 24px;
    }

    .stat-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .stat-card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      color: #ffffff;
      padding: 12px;
    }

    .stat-icon--blue {
      background: #3b82f6;
    }

    .stat-icon--green {
      background: #22c55e;
    }

    .stat-icon--red {
      background: #ef4444;
    }

    .stat-icon--orange {
      background: #f97316;
    }

    .stat-card__change {
      color: #16a34a;
      font-size: 14px;
      font-weight: 500;
    }

    .stat-card__label {
      margin: 0;
      color: #4b5563;
      font-size: 14px;
      font-weight: 500;
    }

    .stat-card__value {
      margin: 4px 0 0;
      color: #111827;
      font-size: 30px;
      line-height: 1.2;
      font-weight: 700;
    }

    .stat-card__meta {
      margin: 4px 0 0;
      color: #6b7280;
      font-size: 14px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .chart-card {
      padding: 24px;
    }

    .chart-card h2,
    .recent-card h2 {
      margin: 0;
      color: #111827;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.3;
    }

    .bar-chart,
    .line-chart {
      position: relative;
      height: 300px;
      margin-top: 16px;
    }

    .chart-gridlines {
      position: absolute;
      inset: 16px 0 38px;
      display: grid;
      grid-template-rows: repeat(4, 1fr);
    }

    .chart-gridlines span {
      border-top: 1px dashed #d1d5db;
    }

    .bar-chart__plot {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      align-items: end;
      height: 100%;
      gap: 14px;
      padding: 16px 8px 0;
    }

    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      min-width: 0;
    }

    .bar-group__bars {
      display: flex;
      align-items: end;
      justify-content: center;
      gap: 4px;
      width: 100%;
      min-height: 0;
      flex: 1;
    }

    .bar {
      display: block;
      width: 14px;
      min-height: 0;
      border-radius: 4px 4px 0 0;
      transition: height 160ms ease;
    }

    .bar--sent {
      background: #3b82f6;
    }

    .bar--delivered {
      background: #10b981;
    }

    .bar-group__label {
      margin-top: 8px;
      color: #6b7280;
      font-size: 12px;
      text-transform: capitalize;
    }

    .chart-legend {
      display: flex;
      gap: 16px;
      margin-top: 10px;
      color: #4b5563;
      font-size: 13px;
    }

    .chart-legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
    }

    .legend-dot--sent {
      background: #3b82f6;
    }

    .legend-dot--delivered {
      background: #10b981;
    }

    .line-chart svg {
      display: block;
      width: 100%;
      height: 260px;
      color: #d1d5db;
    }

    .line-chart path {
      stroke-dasharray: 3 3;
    }

    .line-chart polyline {
      fill: none;
      stroke: #10b981;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .line-chart__labels {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      color: #6b7280;
      font-size: 12px;
      text-align: center;
      text-transform: capitalize;
    }

    .recent-card {
      overflow: hidden;
    }

    .recent-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 24px;
    }

    .recent-card__header a {
      display: inline-flex;
      align-items: center;
      color: #2563eb;
      font-size: 14px;
      font-weight: 500;
      transition: color 160ms ease;
    }

    .recent-card__header a:hover {
      color: #1d4ed8;
    }

    .recent-card__header svg {
      width: 16px;
      height: 16px;
      margin-left: 4px;
    }

    .recent-card__body {
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
      margin: 0;
      color: #4b5563;
    }

    .empty-state a {
      display: inline-flex;
      align-items: center;
      margin-top: 16px;
      border-radius: 8px;
      background: #2563eb;
      color: #ffffff;
      padding: 8px 16px;
      font-weight: 500;
      transition: background 160ms ease;
    }

    .empty-state a:hover {
      background: #1d4ed8;
    }

    .message-row {
      display: flex;
      align-items: center;
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

    .message-row__content {
      min-width: 0;
      flex: 1;
    }

    .message-row__headline {
      display: flex;
      align-items: center;
      gap: 12px;
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

    .status--delivered {
      background: #dcfce7;
      color: #15803d;
    }

    .status--failed {
      background: #fee2e2;
      color: #b91c1c;
    }

    .status--sent {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .status--pending {
      background: #fef3c7;
      color: #a16207;
    }

    .message-row__content p {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      margin: 4px 0 0;
      color: #4b5563;
      font-size: 14px;
    }

    .message-row__meta {
      margin-left: 16px;
      text-align: right;
    }

    .message-row__meta div {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      color: #6b7280;
      font-size: 14px;
    }

    .message-row__meta svg {
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .message-row__meta p {
      margin: 4px 0 0;
      color: #111827;
      font-size: 14px;
      font-weight: 500;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (min-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .charts-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .dashboard-header,
      .message-row {
        align-items: flex-start;
        flex-direction: column;
      }

      .primary-action {
        width: 100%;
        justify-content: center;
      }

      .message-row__meta {
        margin-left: 0;
        text-align: left;
      }

      .message-row__meta div {
        justify-content: flex-start;
      }
    }
  `]
})
export class DashboardOverviewPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  profile: DashboardProfile | null = null;
  loading = true;
  stats: DashboardStats = {
    totalSent: 0,
    delivered: 0,
    failed: 0,
    pending: 0
  };
  recentMessages: SmsMessage[] = [];
  chartData: ChartPoint[] = this.createEmptyChartData();

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  get credits(): number {
    return Number(this.profile?.credits ?? 0);
  }

  get balanceInSoles(): number {
    return this.credits * 0.08;
  }

  get statCards(): StatCard[] {
    return [
      {
        name: 'Total Enviados',
        value: this.formatNumber(this.stats.totalSent),
        icon: 'send',
        colorClass: 'stat-icon--blue',
        change: '+12.5%'
      },
      {
        name: 'Entregados',
        value: this.formatNumber(this.stats.delivered),
        icon: 'check',
        colorClass: 'stat-icon--green',
        percentage: this.deliveryPercentage
      },
      {
        name: 'Fallidos',
        value: this.formatNumber(this.stats.failed),
        icon: 'x',
        colorClass: 'stat-icon--red',
        percentage: this.failedPercentage
      },
      {
        name: 'Saldo disponible',
        value: `S/ ${this.formatCurrency(this.balanceInSoles)}`,
        icon: 'credit',
        colorClass: this.balanceIconClass,
        subtitle: `${this.formatCredits(this.credits)} SMS disponibles`
      }
    ];
  }

  get maxChartValue(): number {
    return Math.max(1, ...this.chartData.flatMap((point) => [point.enviados, point.entregados]));
  }

  get linePoints(): string {
    const maxValue = this.maxChartValue;
    const width = 280;
    const startX = 20;
    const minY = 30;
    const maxY = 230;
    const step = width / Math.max(1, this.chartData.length - 1);

    return this.chartData
      .map((point, index) => {
        const x = startX + index * step;
        const y = maxY - (point.entregados / maxValue) * (maxY - minY);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  barHeight(value: number): number {
    return (value / this.maxChartValue) * 100;
  }

  formatNumber(value: number, decimals = 0): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  formatCurrency(value: number): string {
    return this.formatNumber(value, 2);
  }

  formatCredits(value: number): string {
    return this.formatNumber(value, 0);
  }

  statusLabel(status: string): string {
    if (status === 'delivered') return 'Entregado';
    if (status === 'failed') return 'Fallido';
    if (status === 'sent') return 'Enviado';
    return 'Pendiente';
  }

  statusClass(status: string): string {
    if (status === 'delivered') return 'status--delivered';
    if (status === 'failed') return 'status--failed';
    if (status === 'sent') return 'status--sent';
    return 'status--pending';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private get deliveryPercentage(): string {
    return this.stats.totalSent > 0
      ? `${((this.stats.delivered / this.stats.totalSent) * 100).toFixed(1)}%`
      : '0%';
  }

  private get failedPercentage(): string {
    return this.stats.totalSent > 0
      ? `${((this.stats.failed / this.stats.totalSent) * 100).toFixed(1)}%`
      : '0%';
  }

  private get balanceIconClass(): string {
    if (this.balanceInSoles > 30) return 'stat-icon--green';
    if (this.balanceInSoles >= 12) return 'stat-icon--orange';
    return 'stat-icon--red';
  }

  private async loadDashboardData(): Promise<void> {
    try {
      const { data: sessionData } = await this.supabase.instance.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        return;
      }

      const { data: profileData } = await this.supabase.instance
        .from('profiles')
        .select('id, full_name, credits')
        .eq('id', user.id)
        .maybeSingle();

      this.profile = (profileData as DashboardProfile | null) ?? null;

      const { data: messagesData } = await this.supabase.instance
        .from('sms_messages')
        .select('id, to_phone, message, status, cost, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const messages = (messagesData as SmsMessage[] | null) ?? [];
      this.applyMessages(messages);
    } catch {
      this.applyMessages([]);
    } finally {
      this.loading = false;
    }
  }

  private applyMessages(messages: SmsMessage[]): void {
    this.stats = {
      totalSent: messages.length,
      delivered: messages.filter((message) => message.status === 'delivered').length,
      failed: messages.filter((message) => message.status === 'failed').length,
      pending: messages.filter((message) => message.status === 'pending').length
    };
    this.recentMessages = messages.slice(0, 5);
    this.chartData = this.createChartData(messages);
  }

  private createChartData(messages: SmsMessage[]): ChartPoint[] {
    const last7Days = Array.from({ length: 7 }, (_value, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toISOString().split('T')[0] ?? '';
    });

    return last7Days.map((date) => {
      const dayMessages = messages.filter((message) => message.created_at.split('T')[0] === date);

      return {
        date: new Date(date).toLocaleDateString('es-PE', { weekday: 'short' }),
        enviados: dayMessages.length,
        entregados: dayMessages.filter((message) => message.status === 'delivered').length
      };
    });
  }

  private createEmptyChartData(): ChartPoint[] {
    return this.createChartData([]);
  }
}

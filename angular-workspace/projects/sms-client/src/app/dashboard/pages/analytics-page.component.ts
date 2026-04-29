import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { SupabaseService } from '@sms-fortuna/shared';

interface SmsAnalyticsMessage {
  id: string;
  user_id: string;
  status: string;
  cost: number | null;
  created_at: string;
}

interface AnalyticsStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  sent: number;
  totalCost: number;
  deliveryRate: number;
}

interface DailyDataPoint {
  date: string;
  isoDate: string;
  total: number;
  entregados: number;
  fallidos: number;
}

interface StatusDataPoint {
  name: string;
  value: number;
  color: string;
}

interface MonthlyDataPoint {
  mes: string;
  month: number;
  year: number;
  mensajes: number;
  costo: number;
}

@Component({
  selector: 'sms-analytics-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner" aria-label="Cargando"></div>
    </div>

    <div *ngIf="!loading" class="analytics-page">
      <header>
        <h1>Panel de Análisis</h1>
        <p>Métricas y estadísticas detalladas de tus envíos</p>
      </header>

      <section class="kpi-grid" aria-label="Indicadores principales">
        <article class="kpi-card">
          <div class="kpi-card__top">
            <div class="icon-box icon-box--blue">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
              </svg>
            </div>
            <svg class="trend-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m23 6-9.5 9.5-5-5L1 18"></path>
              <path d="M17 6h6v6"></path>
            </svg>
          </div>
          <p class="kpi-label">Total Enviados</p>
          <p class="kpi-value">{{ stats.total }}</p>
        </article>

        <article class="kpi-card">
          <div class="kpi-card__top">
            <div class="icon-box icon-box--green">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 12l2 2 4-4"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            </div>
          </div>
          <p class="kpi-label">Tasa de Entrega</p>
          <p class="kpi-value">{{ stats.deliveryRate.toFixed(1) }}%</p>
          <p class="kpi-note">{{ stats.delivered }} entregados</p>
        </article>

        <article class="kpi-card">
          <div class="kpi-card__top">
            <div class="icon-box icon-box--red">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m15 9-6 6"></path>
                <path d="m9 9 6 6"></path>
              </svg>
            </div>
          </div>
          <p class="kpi-label">SMS Fallidos</p>
          <p class="kpi-value">{{ stats.failed }}</p>
          <p class="kpi-note">{{ failedRate }}% del total</p>
        </article>

        <article class="kpi-card">
          <div class="kpi-card__top">
            <div class="icon-box icon-box--purple">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2v20"></path>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
          <p class="kpi-label">Gasto Total</p>
          <p class="kpi-value">S/ {{ stats.totalCost.toFixed(2) }}</p>
        </article>
      </section>

      <section class="chart-grid">
        <article class="chart-card">
          <h2>Envíos últimos 30 días</h2>

          <ng-container *ngIf="hasMessages; else noDailyData">
            <svg class="line-chart" viewBox="0 0 600 300" role="img" aria-label="Envíos últimos 30 días">
              <g class="grid-lines">
                <path d="M48 32H576"></path>
                <path d="M48 94H576"></path>
                <path d="M48 156H576"></path>
                <path d="M48 218H576"></path>
                <path d="M48 280H576"></path>
              </g>
              <path class="axis" d="M48 32V280H576"></path>
              <polyline
                class="line line--total"
                [attr.points]="dailyTotalPoints"
              ></polyline>
              <polyline
                class="line line--delivered"
                [attr.points]="dailyDeliveredPoints"
              ></polyline>
              <g class="x-labels">
                <text
                  *ngFor="let tick of dailyTicks"
                  [attr.x]="tick.x"
                  y="296"
                  text-anchor="middle"
                >
                  {{ tick.label }}
                </text>
              </g>
            </svg>

            <div class="legend">
              <span><i class="legend-dot legend-dot--blue"></i>Total</span>
              <span><i class="legend-dot legend-dot--green"></i>Entregados</span>
            </div>
          </ng-container>

          <ng-template #noDailyData>
            <div class="empty-chart">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3v18h18"></path>
                <path d="m19 9-5 5-4-4-3 3"></path>
              </svg>
              <p>No hay mensajes para analizar todavía</p>
            </div>
          </ng-template>
        </article>

        <article class="chart-card">
          <h2>Distribución por Estado</h2>

          <ng-container *ngIf="hasMessages; else noStatusData">
            <div class="pie-wrap">
              <div class="pie-chart" [style.background]="pieGradient"></div>
              <div class="status-legend">
                <div *ngFor="let item of statusData" class="status-row">
                  <span class="status-row__name">
                    <i [style.background]="item.color"></i>
                    {{ item.name }}
                  </span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </div>
          </ng-container>

          <ng-template #noStatusData>
            <div class="empty-chart">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
              </svg>
              <p>No hay mensajes para analizar todavía</p>
            </div>
          </ng-template>
        </article>
      </section>

      <section class="chart-card">
        <h2>Tendencia últimos 6 meses</h2>

        <ng-container *ngIf="hasMessages; else noMonthlyData">
          <div class="bar-chart" role="img" aria-label="Tendencia últimos 6 meses">
            <div *ngFor="let item of monthlyData" class="bar-group">
              <div class="bars">
                <span
                  class="bar bar--messages"
                  [style.height.%]="monthlyMessageHeight(item.mensajes)"
                  [attr.title]="'Mensajes enviados: ' + item.mensajes"
                ></span>
                <span
                  class="bar bar--cost"
                  [style.height.%]="monthlyCostHeight(item.costo)"
                  [attr.title]="'Costo (S/): ' + item.costo.toFixed(2)"
                ></span>
              </div>
              <span class="bar-label">{{ item.mes }}</span>
            </div>
          </div>

          <div class="legend">
            <span><i class="legend-dot legend-dot--blue"></i>Mensajes enviados</span>
            <span><i class="legend-dot legend-dot--green"></i>Costo (S/)</span>
          </div>
        </ng-container>

        <ng-template #noMonthlyData>
          <div class="empty-chart">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3v18h18"></path>
              <rect x="7" y="12" width="3" height="5"></rect>
              <rect x="12" y="8" width="3" height="9"></rect>
              <rect x="17" y="5" width="3" height="12"></rect>
            </svg>
            <p>No hay mensajes para analizar todavía</p>
          </div>
        </ng-template>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    :host *,
    :host *::before,
    :host *::after {
      box-sizing: border-box;
    }

    svg {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    .loading-state {
      align-items: center;
      display: flex;
      height: 384px;
      justify-content: center;
    }

    .spinner {
      animation: spin 800ms linear infinite;
      border: 0 solid transparent;
      border-bottom: 2px solid #2563eb;
      border-radius: 999px;
      height: 48px;
      width: 48px;
    }

    .analytics-page {
      display: grid;
      gap: 24px;
    }

    h1 {
      color: #111827;
      font-size: 30px;
      font-weight: 700;
      line-height: 36px;
    }

    header p {
      color: #4b5563;
      line-height: 24px;
      margin-top: 4px;
    }

    .kpi-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .kpi-card,
    .chart-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      padding: 24px;
    }

    .kpi-card__top {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .icon-box {
      border-radius: 8px;
      padding: 12px;
    }

    .icon-box svg {
      height: 24px;
      width: 24px;
    }

    .icon-box--blue {
      background: #dbeafe;
      color: #2563eb;
    }

    .icon-box--green {
      background: #dcfce7;
      color: #16a34a;
    }

    .icon-box--red {
      background: #fee2e2;
      color: #dc2626;
    }

    .icon-box--purple {
      background: #f3e8ff;
      color: #9333ea;
    }

    .trend-icon {
      color: #16a34a;
      height: 20px;
      width: 20px;
    }

    .kpi-label {
      color: #4b5563;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
    }

    .kpi-value {
      color: #111827;
      font-size: 30px;
      font-weight: 700;
      line-height: 36px;
      margin-top: 4px;
    }

    .kpi-note {
      color: #6b7280;
      font-size: 14px;
      line-height: 20px;
      margin-top: 4px;
    }

    .chart-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .chart-card h2 {
      color: #111827;
      font-size: 18px;
      font-weight: 700;
      line-height: 28px;
      margin-bottom: 16px;
    }

    .line-chart {
      display: block;
      height: 300px;
      width: 100%;
    }

    .grid-lines path {
      color: #e5e7eb;
      stroke-dasharray: 3 3;
    }

    .axis {
      color: #d1d5db;
    }

    .line {
      fill: none;
      stroke-width: 3;
    }

    .line--total {
      stroke: #3b82f6;
    }

    .line--delivered {
      stroke: #10b981;
    }

    .x-labels {
      fill: #6b7280;
      font-size: 12px;
      stroke: none;
    }

    .legend {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
      margin-top: 12px;
    }

    .legend span {
      align-items: center;
      color: #4b5563;
      display: inline-flex;
      font-size: 14px;
      gap: 6px;
      line-height: 20px;
    }

    .legend-dot {
      border-radius: 999px;
      display: inline-block;
      height: 10px;
      width: 10px;
    }

    .legend-dot--blue {
      background: #3b82f6;
    }

    .legend-dot--green {
      background: #10b981;
    }

    .pie-wrap {
      align-items: center;
      display: grid;
      gap: 24px;
      min-height: 300px;
      place-items: center;
    }

    .pie-chart {
      border-radius: 999px;
      height: 192px;
      width: 192px;
    }

    .status-legend {
      display: grid;
      gap: 10px;
      width: min(100%, 280px);
    }

    .status-row {
      align-items: center;
      display: flex;
      justify-content: space-between;
      color: #374151;
      font-size: 14px;
      line-height: 20px;
    }

    .status-row__name {
      align-items: center;
      display: inline-flex;
      gap: 8px;
    }

    .status-row i {
      border-radius: 999px;
      display: inline-block;
      height: 10px;
      width: 10px;
    }

    .bar-chart {
      align-items: end;
      border-bottom: 1px solid #d1d5db;
      border-left: 1px solid #d1d5db;
      display: grid;
      gap: 18px;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      height: 300px;
      padding: 24px 16px 0;
    }

    .bar-group {
      align-items: center;
      display: grid;
      gap: 8px;
      height: 100%;
      grid-template-rows: 1fr auto;
      min-width: 0;
    }

    .bars {
      align-items: end;
      display: flex;
      gap: 6px;
      height: 100%;
      justify-content: center;
    }

    .bar {
      border-radius: 4px 4px 0 0;
      display: block;
      min-height: 4px;
      width: 24px;
    }

    .bar--messages {
      background: #3b82f6;
    }

    .bar--cost {
      background: #10b981;
    }

    .bar-label {
      color: #6b7280;
      font-size: 12px;
      line-height: 16px;
      text-align: center;
      text-transform: capitalize;
    }

    .empty-chart {
      align-items: center;
      color: #6b7280;
      display: flex;
      flex-direction: column;
      font-size: 14px;
      gap: 12px;
      justify-content: center;
      min-height: 300px;
      text-align: center;
    }

    .empty-chart svg {
      color: #9ca3af;
      height: 44px;
      width: 44px;
    }

    @media (min-width: 768px) {
      .kpi-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .kpi-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .chart-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .bar-chart {
        gap: 10px;
        padding-left: 8px;
        padding-right: 8px;
      }

      .bar {
        width: 16px;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class AnalyticsPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  loading = true;
  stats: AnalyticsStats = this.emptyStats();
  dailyData: DailyDataPoint[] = this.createDailyData([]);
  statusData: StatusDataPoint[] = this.createStatusData(this.emptyStats());
  monthlyData: MonthlyDataPoint[] = this.createMonthlyData([]);

  ngOnInit(): void {
    void this.loadAnalytics();
  }

  get hasMessages(): boolean {
    return this.stats.total > 0;
  }

  get failedRate(): string {
    return this.stats.total > 0
      ? ((this.stats.failed / this.stats.total) * 100).toFixed(1)
      : '0';
  }

  get dailyTotalPoints(): string {
    return this.linePoints(this.dailyData.map((point) => point.total));
  }

  get dailyDeliveredPoints(): string {
    return this.linePoints(this.dailyData.map((point) => point.entregados));
  }

  get dailyTicks(): Array<{ label: string; x: number }> {
    const indexes = [0, 5, 11, 17, 23, 29];
    return indexes.map((index) => ({
      label: this.dailyData[index]?.date ?? '',
      x: this.xForIndex(index, 30)
    }));
  }

  get pieGradient(): string {
    if (!this.hasMessages) {
      return '#f3f4f6';
    }

    let cursor = 0;
    const parts = this.statusData
      .filter((item) => item.value > 0)
      .map((item) => {
        const start = cursor;
        cursor += (item.value / this.stats.total) * 100;
        return `${item.color} ${start}% ${cursor}%`;
      });

    return `conic-gradient(${parts.join(', ')})`;
  }

  monthlyMessageHeight(value: number): number {
    const max = Math.max(...this.monthlyData.map((item) => item.mensajes), 1);
    return Math.max((value / max) * 100, value > 0 ? 4 : 0);
  }

  monthlyCostHeight(value: number): number {
    const max = Math.max(...this.monthlyData.map((item) => item.costo), 1);
    return Math.max((value / max) * 100, value > 0 ? 4 : 0);
  }

  private async loadAnalytics(): Promise<void> {
    try {
      const { data: sessionData } = await this.supabase.instance.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        this.applyMessages([]);
        return;
      }

      const { data, error } = await this.supabase.instance
        .from('sms_messages')
        .select('id, user_id, status, cost, created_at')
        .eq('user_id', user.id);

      if (error) {
        this.applyMessages([]);
        return;
      }

      this.applyMessages((data as SmsAnalyticsMessage[] | null) ?? []);
    } catch {
      this.applyMessages([]);
    } finally {
      this.loading = false;
    }
  }

  private applyMessages(messages: SmsAnalyticsMessage[]): void {
    this.stats = this.calculateStats(messages);
    this.dailyData = this.createDailyData(messages);
    this.statusData = this.createStatusData(this.stats);
    this.monthlyData = this.createMonthlyData(messages);
  }

  private calculateStats(messages: SmsAnalyticsMessage[]): AnalyticsStats {
    const total = messages.length;
    const delivered = messages.filter((message) => message.status === 'delivered').length;
    const failed = messages.filter((message) => message.status === 'failed').length;
    const pending = messages.filter((message) => message.status === 'pending').length;
    const sent = messages.filter((message) => message.status === 'sent').length;
    const totalCost = messages.reduce((sum, message) => sum + Number(message.cost ?? 0), 0);
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;

    return {
      total,
      delivered,
      failed,
      pending,
      sent,
      totalCost,
      deliveryRate
    };
  }

  private createDailyData(messages: SmsAnalyticsMessage[]): DailyDataPoint[] {
    const last30Days = Array.from({ length: 30 }, (_value, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      return date.toISOString().split('T')[0] ?? '';
    });

    return last30Days.map((date) => {
      const dayMessages = messages.filter((message) => message.created_at.split('T')[0] === date);

      return {
        isoDate: date,
        date: new Date(`${date}T00:00:00`).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'short'
        }),
        total: dayMessages.length,
        entregados: dayMessages.filter((message) => message.status === 'delivered').length,
        fallidos: dayMessages.filter((message) => message.status === 'failed').length
      };
    });
  }

  private createStatusData(stats: AnalyticsStats): StatusDataPoint[] {
    return [
      { name: 'Entregados', value: stats.delivered, color: '#10b981' },
      { name: 'Enviados', value: stats.sent, color: '#3b82f6' },
      { name: 'Pendientes', value: stats.pending, color: '#f59e0b' },
      { name: 'Fallidos', value: stats.failed, color: '#ef4444' }
    ];
  }

  private createMonthlyData(messages: SmsAnalyticsMessage[]): MonthlyDataPoint[] {
    const last6Months = Array.from({ length: 6 }, (_value, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));

      return {
        month: date.getMonth(),
        year: date.getFullYear(),
        mes: date.toLocaleDateString('es-PE', { month: 'short' })
      };
    });

    return last6Months.map((month) => {
      const monthMessages = messages.filter((message) => {
        const messageDate = new Date(message.created_at);
        return (
          messageDate.getMonth() === month.month &&
          messageDate.getFullYear() === month.year
        );
      });

      return {
        ...month,
        mensajes: monthMessages.length,
        costo: monthMessages.reduce(
          (sum, message) => sum + Number(message.cost ?? 0),
          0
        )
      };
    });
  }

  private linePoints(values: number[]): string {
    const max = Math.max(...values, 1);

    return values
      .map((value, index) => `${this.xForIndex(index, values.length)},${this.yForValue(value, max)}`)
      .join(' ');
  }

  private xForIndex(index: number, total: number): number {
    const minX = 48;
    const maxX = 576;
    return minX + (index / Math.max(total - 1, 1)) * (maxX - minX);
  }

  private yForValue(value: number, max: number): number {
    const minY = 32;
    const maxY = 280;
    return maxY - (value / max) * (maxY - minY);
  }

  private emptyStats(): AnalyticsStats {
    return {
      total: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      sent: 0,
      totalCost: 0,
      deliveryRate: 0
    };
  }
}

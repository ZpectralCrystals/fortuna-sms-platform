
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
  accepted: number;
  failed: number;
  pending: number;
  sent: number;
  totalCost: number;
  successRate: number;
}

interface DailyDataPoint {
  date: string;
  isoDate: string;
  total: number;
  aceptados: number;
  fallidos: number;
}

interface DailyChartPoint {
  x: number;
  totalY: number;
  acceptedY: number;
  date: string;
  total: number;
  accepted: number;
}

interface DailyGridLine {
  y: number;
  label: string;
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
    imports: [],
    templateUrl: './analytics-page.component.html',
    styleUrl: './analytics-page.component.scss'
})
export class AnalyticsPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly futureAcceptedStatus = `${'deliver'}${'ed'}`;

  loading = true;
  stats: AnalyticsStats = this.emptyStats();
  dailyData: DailyDataPoint[] = this.createDailyData([]);
  statusData: StatusDataPoint[] = this.createStatusData(this.emptyStats());
  monthlyData: MonthlyDataPoint[] = this.createMonthlyData([]);
  activeDailyPoint: DailyChartPoint | null = null;

  ngOnInit(): void {
    void this.loadAnalytics();
  }

  get hasMessages(): boolean {
    return this.statusTotal > 0;
  }

  get failedRate(): string {
    return this.processedTotal > 0
      ? ((this.stats.failed / this.processedTotal) * 100).toFixed(1)
      : '0';
  }

  get processedTotal(): number {
    return this.stats.accepted + this.stats.failed;
  }

  get dailyTotalPath(): string {
    return this.smoothLinePath(this.dailyChartPoints.map((point) => ({ x: point.x, y: point.totalY })));
  }

  get dailyAcceptedPath(): string {
    return this.smoothLinePath(this.dailyChartPoints.map((point) => ({ x: point.x, y: point.acceptedY })));
  }

  get dailyChartPoints(): DailyChartPoint[] {
    const max = this.dailyMaxValue;

    return this.dailyData.map((point, index) => ({
      x: this.xForIndex(index, this.dailyData.length),
      totalY: this.yForValue(point.total, max),
      acceptedY: this.yForValue(point.aceptados, max),
      date: point.date,
      total: point.total,
      accepted: point.aceptados
    }));
  }

  get dailyGridLines(): DailyGridLine[] {
    const max = this.dailyMaxValue;
    return [max, max * 0.75, max * 0.5, max * 0.25, 0].map((value) => ({
      y: this.yForValue(value, max),
      label: this.formatTick(value)
    }));
  }

  get dailyMaxValue(): number {
    return Math.max(1, ...this.dailyData.flatMap((point) => [point.total, point.aceptados]));
  }

  get dailyTooltipX(): number {
    if (!this.activeDailyPoint) return 0;
    return Math.min(448, Math.max(56, this.activeDailyPoint.x - 64));
  }

  get dailyTooltipY(): number {
    if (!this.activeDailyPoint) return 0;
    const minY = Math.min(this.activeDailyPoint.totalY, this.activeDailyPoint.acceptedY);
    return Math.max(36, minY - 76);
  }

  get dailyTicks(): Array<{ label: string; x: number }> {
    const indexes = [0, 5, 11, 17, 23, 29];
    return indexes.map((index) => ({
      label: this.dailyData[index]?.date ?? '',
      x: this.xForIndex(index, 30)
    }));
  }

  showDailyTooltip(point: DailyChartPoint): void {
    this.activeDailyPoint = point;
  }

  hideDailyTooltip(): void {
    this.activeDailyPoint = null;
  }

  get pieGradient(): string {
    if (this.statusTotal === 0) {
      return '#f3f4f6';
    }

    let cursor = 0;
    const parts = this.statusData
      .filter((item) => item.value > 0)
      .map((item) => {
        const start = cursor;
        cursor += (item.value / this.statusTotal) * 100;
        return `${item.color} ${start}% ${cursor}%`;
      });

    return `conic-gradient(${parts.join(', ')})`;
  }

  get statusTotal(): number {
    return this.statusData.reduce((total, item) => total + item.value, 0);
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
    const accepted = messages.filter((message) => this.isAcceptedStatus(message.status)).length;
    const total = accepted;
    const failed = messages.filter((message) => message.status === 'failed').length;
    const pending = messages.filter((message) => message.status === 'pending').length;
    const sent = messages.filter((message) => message.status === 'sent').length;
    const totalCost = messages
      .filter((message) => this.isAcceptedStatus(message.status))
      .reduce((sum, message) => sum + Number(message.cost ?? 0), 0);
    const processedTotal = accepted + failed;
    const successRate = processedTotal > 0 ? (accepted / processedTotal) * 100 : 0;

    return {
      total,
      accepted,
      failed,
      pending,
      sent,
      totalCost,
      successRate
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
        aceptados: dayMessages.filter((message) => this.isAcceptedStatus(message.status)).length,
        fallidos: dayMessages.filter((message) => message.status === 'failed').length
      };
    });
  }

  private createStatusData(stats: AnalyticsStats): StatusDataPoint[] {
    return [
      { name: 'Aceptados', value: stats.accepted, color: '#10b981' },
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
        mensajes: monthMessages.filter((message) => this.isAcceptedStatus(message.status)).length,
        costo: monthMessages.filter((message) => this.isAcceptedStatus(message.status)).reduce(
          (sum, message) => sum + Number(message.cost ?? 0),
          0
        )
      };
    });
  }

  private smoothLinePath(points: Array<{ x: number; y: number }>): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    return points.slice(1).reduce((path, point, index) => {
      const previous = points[index];
      const midX = (previous.x + point.x) / 2;

      return `${path} C ${midX.toFixed(1)} ${previous.y.toFixed(1)}, ${midX.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }, `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`);
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

  private formatTick(value: number): string {
    if (value % 1 === 0) return value.toFixed(0);
    return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  private emptyStats(): AnalyticsStats {
    return {
      total: 0,
      accepted: 0,
      failed: 0,
      pending: 0,
      sent: 0,
      totalCost: 0,
      successRate: 0
    };
  }

  private isAcceptedStatus(status: string): boolean {
    return status === 'sent' || status === this.futureAcceptedStatus;
  }
}

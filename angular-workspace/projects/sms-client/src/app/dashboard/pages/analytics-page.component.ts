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
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.scss'
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

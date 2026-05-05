import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AuthProfile,
  AuthService,
  ClientSmsMessage,
  ClientSmsStats,
  SmsMessageStatus,
  SmsService,
  formatNumber as sharedFormatNumber,
  formatPercent
} from '@sms-fortuna/shared';

interface ChartPoint {
  date: string;
  enviados: number;
  entregados: number;
}

interface StatCard {
  name: string;
  value: string;
  icon: 'send' | 'x' | 'credit' | 'cost';
  colorClass: string;
  change?: string;
  percentage?: string;
  subtitle?: string;
}

@Component({
  selector: 'sms-dashboard-overview-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-overview-page.component.html',
  styleUrl: './dashboard-overview-page.component.scss'
})
export class DashboardOverviewPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly smsService = inject(SmsService);

  profile: AuthProfile | null = null;
  loading = true;
  errorMessage = '';
  stats: ClientSmsStats = {
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    consumedSegments: 0,
    totalCost: 0
  };
  recentMessages: ClientSmsMessage[] = [];
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
        name: 'Créditos disponibles',
        value: this.formatCredits(this.credits),
        icon: 'credit',
        colorClass: this.balanceIconClass,
        subtitle: `Saldo aprox. S/ ${this.formatCurrency(this.balanceInSoles)}`
      },
      {
        name: 'SMS enviados',
        value: this.formatNumber(this.sentOrDeliveredCount),
        icon: 'send',
        colorClass: 'stat-icon--blue',
        percentage: this.deliveryPercentage
      },
      {
        name: 'SMS fallidos',
        value: this.formatNumber(this.stats.failed),
        icon: 'x',
        colorClass: 'stat-icon--red',
        percentage: this.failedPercentage
      },
      {
        name: 'SMS consumidos',
        value: this.formatNumber(this.stats.consumedSegments),
        icon: 'credit',
        colorClass: 'stat-icon--green',
        subtitle: 'Créditos debitados'
      },
      {
        name: 'Costo total estimado',
        value: `S/ ${this.formatCurrency(this.stats.totalCost)}`,
        icon: 'cost',
        colorClass: 'stat-icon--orange',
        subtitle: 'Mensajes enviados/entregados'
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
    return sharedFormatNumber(value, 'en-US', {
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

  statusLabel(status: SmsMessageStatus): string {
    if (status === 'delivered') return 'Entregado';
    if (status === 'failed') return 'Fallido';
    if (status === 'sent') return 'Enviado';
    return 'Pendiente';
  }

  statusClass(status: SmsMessageStatus): string {
    if (status === 'delivered') return 'status--delivered';
    if (status === 'failed') return 'status--failed';
    if (status === 'sent') return 'status--sent';
    return 'status--pending';
  }

  formatDate(value: string | null): string {
    if (!value) return '-';

    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private get deliveryPercentage(): string {
    return this.sentOrDeliveredCount > 0
      ? formatPercent((this.stats.delivered / this.sentOrDeliveredCount) * 100, 'en-US')
      : '0%';
  }

  private get failedPercentage(): string {
    return this.stats.total > 0
      ? formatPercent((this.stats.failed / this.stats.total) * 100, 'en-US')
      : '0%';
  }

  private get sentOrDeliveredCount(): number {
    return this.stats.sent + this.stats.delivered;
  }

  private get balanceIconClass(): string {
    if (this.balanceInSoles > 30) return 'stat-icon--green';
    if (this.balanceInSoles >= 12) return 'stat-icon--orange';
    return 'stat-icon--red';
  }

  private async loadDashboardData(): Promise<void> {
    try {
      const [profile, stats, recentMessages, chartMessages] = await Promise.all([
        this.authService.getCurrentProfile(),
        this.smsService.getMySmsStats(),
        this.smsService.getRecentMyMessages(5),
        this.smsService.listMyMessages(200)
      ]);

      this.profile = profile;
      this.stats = stats;
      this.recentMessages = recentMessages;
      this.chartData = this.createChartData(chartMessages);
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar tu dashboard.';
      this.applyMessages([]);
    } finally {
      this.loading = false;
    }
  }

  private applyMessages(messages: ClientSmsMessage[]): void {
    this.stats = {
      total: messages.length,
      sent: messages.filter((message) => message.status === 'sent').length,
      delivered: messages.filter((message) => message.status === 'delivered').length,
      failed: messages.filter((message) => message.status === 'failed').length,
      pending: messages.filter((message) => message.status === 'pending').length,
      consumedSegments: messages
        .filter((message) => message.status === 'sent' || message.status === 'delivered')
        .reduce((total, message) => total + message.segments, 0),
      totalCost: messages
        .filter((message) => message.status === 'sent' || message.status === 'delivered')
        .reduce((total, message) => total + message.cost, 0)
    };
    this.recentMessages = messages.slice(0, 5);
    this.chartData = this.createChartData(messages);
  }

  private createChartData(messages: ClientSmsMessage[]): ChartPoint[] {
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

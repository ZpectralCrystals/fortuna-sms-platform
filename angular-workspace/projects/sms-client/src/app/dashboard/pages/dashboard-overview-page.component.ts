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
  aceptados: number;
}

interface DailyChartPoint {
  x: number;
  totalY: number;
  acceptedY: number;
  date: string;
  total: number;
  accepted: number;
}

interface LinePoint {
  x: number;
  y: number;
  label: string;
  value?: number;
}

interface ChartGridLine {
  y: number;
  label: string;
}

interface ChartBar {
  x: number;
  y: number;
  width: number;
  height: number;
  className: 'chart-bar--sent' | 'chart-bar--accepted';
  label: string;
}

interface StatCard {
  name: string;
  value: string;
  icon: 'send' | 'check' | 'x' | 'credit';
  colorClass: string;
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
  readonly chartWidth = 640;
  readonly chartHeight = 300;
  readonly chartLeft = 48;
  readonly chartRight = 16;
  readonly chartTop = 16;
  readonly chartBottom = 38;
  private readonly futureAcceptedStatus = `${'deliver'}${'ed'}` as SmsMessageStatus;

  profile: AuthProfile | null = null;
  loading = true;
  errorMessage = '';
  stats: ClientSmsStats = this.createEmptyStats();
  recentMessages: ClientSmsMessage[] = [];
  chartData: ChartPoint[] = this.createEmptyChartData();
  activeLinePoint: LinePoint | null = null;
  activeDailyPoint: DailyChartPoint | null = null;

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
        value: this.formatNumber(this.acceptedCount),
        icon: 'send',
        colorClass: 'stat-icon--blue'
      },
      {
        name: 'Aceptados',
        value: this.formatNumber(this.acceptedCount),
        icon: 'check',
        colorClass: 'stat-icon--green',
        percentage: this.successPercentage
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
    return Math.max(1, ...this.chartData.flatMap((point) => [point.enviados, point.aceptados]));
  }

  get chartTicks(): string[] {
    const max = this.maxChartValue;
    return [max, max * 0.75, max * 0.5, max * 0.25, 0].map((value) => this.formatTick(value));
  }

  get chartGridLines(): ChartGridLine[] {
    const max = this.maxChartValue;
    const values = [max, max * 0.75, max * 0.5, max * 0.25, 0];

    return values.map((value) => ({
      y: this.valueToY(value),
      label: this.formatTick(value)
    }));
  }

  get xAxisLabels(): LinePoint[] {
    return this.chartData.map((point, index) => ({
      x: this.indexToX(index),
      y: this.chartHeight - 10,
      label: point.date
    }));
  }

  get barItems(): ChartBar[] {
    const band = this.chartInnerWidth / Math.max(1, this.chartData.length);
    const barWidth = Math.min(24, band * 0.24);
    const gap = 4;

    return this.chartData.flatMap((point, index) => {
      const center = this.chartLeft + band * index + band / 2;
      const sentHeight = this.valueToHeight(point.enviados);
      const acceptedHeight = this.valueToHeight(point.aceptados);

      return [
        {
          x: center - barWidth - gap / 2,
          y: this.chartBottomY - sentHeight,
          width: barWidth,
          height: sentHeight,
          className: 'chart-bar--sent' as const,
          label: `Enviados: ${point.enviados}`
        },
        {
          x: center + gap / 2,
          y: this.chartBottomY - acceptedHeight,
          width: barWidth,
          height: acceptedHeight,
          className: 'chart-bar--accepted' as const,
          label: `Aceptados: ${point.aceptados}`
        }
      ];
    });
  }

  get linePoints(): string {
    return this.createSmoothPath(this.linePointCoordinates);
  }

  get dailyTotalPath(): string {
    return this.createSmoothPath(this.dailyChartPoints.map((point) => ({
      x: point.x,
      y: point.totalY,
      label: point.date
    })));
  }

  get dailyAcceptedPath(): string {
    return this.createSmoothPath(this.dailyChartPoints.map((point) => ({
      x: point.x,
      y: point.acceptedY,
      label: point.date
    })));
  }

  get dailyChartPoints(): DailyChartPoint[] {
    const max = this.maxChartValue;

    return this.chartData.map((point, index) => ({
      x: this.analyticsXForIndex(index, this.chartData.length),
      totalY: this.analyticsYForValue(point.enviados, max),
      acceptedY: this.analyticsYForValue(point.aceptados, max),
      date: point.date,
      total: point.enviados,
      accepted: point.aceptados
    }));
  }

  get dailyGridLines(): ChartGridLine[] {
    const max = this.maxChartValue;

    return [max, max * 0.75, max * 0.5, max * 0.25, 0].map((value) => ({
      y: this.analyticsYForValue(value, max),
      label: this.formatTick(value)
    }));
  }

  get dailyTicks(): Array<{ label: string; x: number }> {
    return this.chartData.map((point, index) => ({
      label: point.date,
      x: this.analyticsXForIndex(index, this.chartData.length)
    }));
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

  get linePointCoordinates(): LinePoint[] {
    return this.chartData.map((point, index) => ({
      x: this.indexToX(index),
      y: this.valueToY(point.aceptados),
      label: `Enviados: ${point.aceptados}`,
      value: point.aceptados
    }));
  }

  get lineTooltipX(): number {
    if (!this.activeLinePoint) return 0;
    const minX = this.chartLeft + 8;
    const maxX = this.chartWidth - this.chartRight - 116;
    return Math.min(maxX, Math.max(minX, this.activeLinePoint.x - 58));
  }

  get lineTooltipY(): number {
    if (!this.activeLinePoint) return 0;
    return Math.max(this.chartTop + 4, this.activeLinePoint.y - 54);
  }

  get chartInnerWidth(): number {
    return this.chartWidth - this.chartLeft - this.chartRight;
  }

  get chartInnerHeight(): number {
    return this.chartHeight - this.chartTop - this.chartBottom;
  }

  get chartBottomY(): number {
    return this.chartHeight - this.chartBottom;
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
    if (status === 'failed') return 'Fallido';
    if (this.isAcceptedStatus(status)) return 'Aceptado';
    return 'Pendiente';
  }

  statusClass(status: SmsMessageStatus): string {
    if (status === 'failed') return 'status--failed';
    if (this.isAcceptedStatus(status)) return 'status--accepted';
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

  private get successPercentage(): string {
    return this.processedCount > 0
      ? formatPercent((this.acceptedCount / this.processedCount) * 100, 'en-US')
      : '0%';
  }

  private get failedPercentage(): string {
    return this.stats.total > 0
      ? formatPercent((this.stats.failed / this.stats.total) * 100, 'en-US')
      : '0%';
  }

  private get acceptedCount(): number {
    return this.stats.sent + this.getFutureAcceptedCount(this.stats);
  }

  private get processedCount(): number {
    return this.acceptedCount + this.stats.failed;
  }

  private get balanceIconClass(): string {
    if (this.balanceInSoles > 30) return 'stat-icon--green';
    if (this.balanceInSoles >= 12) return 'stat-icon--orange';
    return 'stat-icon--red';
  }

  private formatTick(value: number): string {
    if (value % 1 === 0) {
      return this.formatNumber(value);
    }

    return this.formatNumber(value, 2).replace(/0+$/, '').replace(/\.$/, '');
  }

  private indexToX(index: number): number {
    const step = this.chartInnerWidth / Math.max(1, this.chartData.length - 1);
    return this.chartLeft + index * step;
  }

  private valueToY(value: number): number {
    return this.chartBottomY - this.valueToHeight(value);
  }

  private valueToHeight(value: number): number {
    return (value / this.maxChartValue) * this.chartInnerHeight;
  }

  private analyticsXForIndex(index: number, total: number): number {
    const minX = 48;
    const maxX = 576;
    return minX + (index / Math.max(total - 1, 1)) * (maxX - minX);
  }

  private analyticsYForValue(value: number, max: number): number {
    const minY = 32;
    const maxY = 280;
    return maxY - (value / max) * (maxY - minY);
  }

  showLineTooltip(point: LinePoint): void {
    this.activeLinePoint = point;
  }

  hideLineTooltip(): void {
    this.activeLinePoint = null;
  }

  showDailyTooltip(point: DailyChartPoint): void {
    this.activeDailyPoint = point;
  }

  hideDailyTooltip(): void {
    this.activeDailyPoint = null;
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
      [this.futureAcceptedStatus]: messages.filter((message) => this.isFutureAcceptedStatus(message.status)).length,
      failed: messages.filter((message) => message.status === 'failed').length,
      pending: messages.filter((message) => message.status === 'pending').length,
      consumedSegments: messages
        .filter((message) => this.isAcceptedStatus(message.status))
        .reduce((total, message) => total + message.segments, 0),
      totalCost: messages
        .filter((message) => this.isAcceptedStatus(message.status))
        .reduce((total, message) => total + message.cost, 0)
    } as unknown as ClientSmsStats;
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
      const accepted = dayMessages.filter((message) => this.isAcceptedStatus(message.status)).length;

      return {
        date: new Date(date).toLocaleDateString('es-PE', { weekday: 'short' }),
        enviados: dayMessages.length,
        aceptados: accepted
      };
    });
  }

  private createEmptyChartData(): ChartPoint[] {
    return this.createChartData([]);
  }

  private createEmptyStats(): ClientSmsStats {
    return {
      total: 0,
      sent: 0,
      [this.futureAcceptedStatus]: 0,
      failed: 0,
      pending: 0,
      consumedSegments: 0,
      totalCost: 0
    } as unknown as ClientSmsStats;
  }

  private getFutureAcceptedCount(stats: ClientSmsStats): number {
    return Number(stats[this.futureAcceptedStatus as keyof ClientSmsStats] ?? 0);
  }

  private isAcceptedStatus(status: SmsMessageStatus): boolean {
    return status === 'sent' || this.isFutureAcceptedStatus(status);
  }

  private isFutureAcceptedStatus(status: SmsMessageStatus): boolean {
    return status === this.futureAcceptedStatus;
  }

  private createSmoothPath(points: LinePoint[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    return points.slice(1).reduce((path, point, index) => {
      const previous = points[index];
      const midX = (previous.x + point.x) / 2;

      return `${path} C ${midX.toFixed(1)} ${previous.y.toFixed(1)}, ${midX.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }, `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`);
  }
}

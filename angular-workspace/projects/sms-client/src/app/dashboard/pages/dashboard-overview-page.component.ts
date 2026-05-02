import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService, formatNumber as sharedFormatNumber, formatPercent } from '@sms-fortuna/shared';

interface DashboardProfile {
  id: string;
  full_name: string | null;
  credits: number | null;
}

interface SmsMessage {
  id: string;
  recipient: string;
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
  templateUrl: './dashboard-overview-page.component.html',
  styleUrl: './dashboard-overview-page.component.scss'
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
      ? formatPercent((this.stats.delivered / this.stats.totalSent) * 100, 'en-US')
      : '0%';
  }

  private get failedPercentage(): string {
    return this.stats.totalSent > 0
      ? formatPercent((this.stats.failed / this.stats.totalSent) * 100, 'en-US')
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
        .select('id, recipient, message, status, cost, created_at')
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

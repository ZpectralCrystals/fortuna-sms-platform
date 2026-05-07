import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AdminSmsMessage, SmsService } from '@sms-fortuna/shared';

interface MarketingKpis {
  accepted: number;
  failed: number;
  totalCost: number;
  activeClients: number;
}

interface DailySmsActivity {
  date: string;
  label: string;
  accepted: number;
  failed: number;
  total: number;
}

interface ClientSmsActivity {
  user_id: string;
  name: string;
  email: string;
  company: string | null;
  accepted: number;
  failed: number;
  segments: number;
  cost: number;
  lastSentAt: string;
}

@Component({
  selector: 'bo-marketing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marketing-page.component.html',
  styleUrl: './marketing-page.component.scss'
})
export class MarketingPageComponent implements OnInit {
  private readonly smsService = inject(SmsService);

  loading = true;
  errorMessage = '';
  messages: AdminSmsMessage[] = [];
  kpis: MarketingKpis = {
    accepted: 0,
    failed: 0,
    totalCost: 0,
    activeClients: 0
  };
  dailyActivity: DailySmsActivity[] = [];
  topClients: ClientSmsActivity[] = [];
  recentHighVolume: ClientSmsActivity[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadMarketingData();
  }

  async loadMarketingData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.messages = await this.smsService.listAdminMessages({ limit: 500 });
      this.kpis = this.buildKpis(this.messages);
      this.dailyActivity = this.buildDailyActivity(this.messages, 30);
      this.topClients = this.buildClientActivity(this.messages).slice(0, 5);
      this.recentHighVolume = this.buildClientActivity(this.filterLastDays(this.messages, 7)).slice(0, 5);
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar la actividad SMS.';
      this.messages = [];
      this.kpis = { accepted: 0, failed: 0, totalCost: 0, activeClients: 0 };
      this.dailyActivity = this.buildEmptyDailyActivity(30);
      this.topClients = [];
      this.recentHighVolume = [];
    } finally {
      this.loading = false;
    }
  }

  getMaxDailyTotal(): number {
    return Math.max(1, ...this.dailyActivity.map((item) => item.total));
  }

  getBarHeight(item: DailySmsActivity): number {
    return Math.max(0, (item.total / this.getMaxDailyTotal()) * 100);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PE').format(value || 0);
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

  private buildKpis(messages: AdminSmsMessage[]): MarketingKpis {
    const accepted = messages.filter((message) => this.isAccepted(message)).length;
    const failed = messages.filter((message) => message.status === 'failed').length;
    const totalCost = messages
      .filter((message) => this.isAccepted(message))
      .reduce((sum, message) => sum + message.cost, 0);
    const activeClients = new Set(messages.map((message) => message.user_id).filter(Boolean)).size;

    return {
      accepted,
      failed,
      totalCost,
      activeClients
    };
  }

  private buildDailyActivity(messages: AdminSmsMessage[], days: number): DailySmsActivity[] {
    const items = this.buildEmptyDailyActivity(days);
    const byDate = new Map(items.map((item) => [item.date, item]));

    for (const message of messages) {
      const dateKey = this.dateKey(message.sent_at || message.created_at);
      const item = byDate.get(dateKey);

      if (!item) {
        continue;
      }

      if (this.isAccepted(message)) {
        item.accepted += 1;
      } else if (message.status === 'failed') {
        item.failed += 1;
      }

      item.total = item.accepted + item.failed;
    }

    return items;
  }

  private buildEmptyDailyActivity(days: number): DailySmsActivity[] {
    const formatter = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' });
    const today = new Date();

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));

      return {
        date: this.dateKey(date.toISOString()),
        label: formatter.format(date),
        accepted: 0,
        failed: 0,
        total: 0
      };
    });
  }

  private buildClientActivity(messages: AdminSmsMessage[]): ClientSmsActivity[] {
    const clients = new Map<string, ClientSmsActivity>();

    for (const message of messages) {
      const key = message.user_id || 'unknown';
      const current = clients.get(key) ?? {
        user_id: key,
        name: message.profile?.full_name || message.profile?.razon_social || message.profile?.email || 'Cliente sin nombre',
        email: message.profile?.email || '-',
        company: message.profile?.razon_social || message.profile?.ruc || null,
        accepted: 0,
        failed: 0,
        segments: 0,
        cost: 0,
        lastSentAt: message.sent_at || message.created_at
      };

      if (this.isAccepted(message)) {
        current.accepted += 1;
        current.segments += message.segments;
        current.cost += message.cost;
      } else if (message.status === 'failed') {
        current.failed += 1;
      }

      const messageDate = new Date(message.sent_at || message.created_at).getTime();
      const currentDate = new Date(current.lastSentAt).getTime();
      if (messageDate > currentDate) {
        current.lastSentAt = message.sent_at || message.created_at;
      }

      clients.set(key, current);
    }

    return Array.from(clients.values())
      .sort((a, b) => b.segments - a.segments || b.accepted - a.accepted);
  }

  private filterLastDays(messages: AdminSmsMessage[], days: number): AdminSmsMessage[] {
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    return messages.filter((message) =>
      new Date(message.sent_at || message.created_at).getTime() >= start.getTime()
    );
  }

  private isAccepted(message: AdminSmsMessage): boolean {
    return message.status === 'sent' || message.status === 'delivered';
  }

  private dateKey(value: string): string {
    return new Date(value).toISOString().slice(0, 10);
  }
}

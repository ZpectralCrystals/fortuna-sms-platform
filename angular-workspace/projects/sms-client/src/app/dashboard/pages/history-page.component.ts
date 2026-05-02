import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '@sms-fortuna/shared';

type StatusFilter = 'all' | 'delivered' | 'sent' | 'pending' | 'failed';

interface SmsHistoryMessage {
  id: string;
  user_id: string;
  recipient: string;
  message: string;
  segments: number | null;
  status: string;
  cost: number | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
}

@Component({
  selector: 'sms-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history-page.component.html',
  styleUrl: './history-page.component.scss'
})
export class HistoryPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  messages: SmsHistoryMessage[] = [];
  searchTerm = '';
  statusFilter: StatusFilter = 'all';
  loading = true;

  async ngOnInit(): Promise<void> {
    await this.fetchMessages();
  }

  get filteredMessages(): SmsHistoryMessage[] {
    let filtered = this.messages;

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((message) => message.status === this.statusFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter((message) =>
        message.recipient.includes(term) ||
        message.message.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  statusText(status: string): string {
    switch (status) {
      case 'delivered':
        return 'Entregado';
      case 'failed':
        return 'Fallido';
      case 'sent':
        return 'Enviado';
      default:
        return 'Pendiente';
    }
  }

  statusIconClass(status: string): string {
    switch (status) {
      case 'delivered':
        return 'status-icon--delivered';
      case 'failed':
        return 'status-icon--failed';
      case 'sent':
        return 'status-icon--sent';
      default:
        return 'status-icon--pending';
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'delivered':
        return 'badge--delivered';
      case 'failed':
        return 'badge--failed';
      case 'sent':
        return 'badge--sent';
      default:
        return 'badge--pending';
    }
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  exportToCSV(): void {
    const headers = ['Fecha', 'Teléfono', 'Mensaje', 'Estado', 'Costo'];
    const rows = this.filteredMessages.map((message) => [
      new Date(message.created_at).toLocaleString('es-PE'),
      message.recipient,
      message.message.replace(/,/g, ';'),
      this.statusText(message.status),
      `S/ ${this.formatCurrency(message.cost ?? 0)}`
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `historial-sms-${new Date().toISOString().split('T')[0]}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private async fetchMessages(): Promise<void> {
    try {
      const { data: sessionData } = await this.supabase.instance.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        return;
      }

      const { data } = await this.supabase.instance
        .from('sms_messages')
        .select('id, user_id, recipient, message, segments, cost, status, created_at, sent_at, error_message')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      this.messages = (data as SmsHistoryMessage[] | null) ?? [];
    } catch {
      this.messages = [];
    } finally {
      this.loading = false;
    }
  }
}

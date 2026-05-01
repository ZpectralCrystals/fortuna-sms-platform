import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';
type StatusFilter = MessageStatus | 'all';
type DateFilter = 'all' | 'today' | 'week' | 'month';

interface BackofficeMessage {
  id: string;
  user_id: string;
  recipient: string;
  message: string;
  status: MessageStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  user: {
    full_name: string;
    email: string;
    company: string | null;
  };
}

@Component({
  selector: 'bo-messages-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages-page.component.html',
  styleUrl: './messages-page.component.scss'
})
export class MessagesPageComponent implements OnInit {
  messages: BackofficeMessage[] = [];
  filteredMessages: BackofficeMessage[] = [];
  loading = true;
  searchTerm = '';
  statusFilter: StatusFilter = 'all';
  dateFilter: DateFilter = 'all';

  get stats() {
    return {
      total: this.messages.length,
      pending: this.messages.filter((message) => message.status === 'pending').length,
      sent: this.messages.filter((message) => message.status === 'sent').length,
      delivered: this.messages.filter((message) => message.status === 'delivered').length,
      failed: this.messages.filter((message) => message.status === 'failed').length
    };
  }

  ngOnInit(): void {
    this.messages = [];
    this.filteredMessages = [];
    this.applyFilters();
    this.loading = false;
  }

  applyFilters(): void {
    let filtered = [...this.messages];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();

      filtered = filtered.filter((message) =>
        message.recipient.toLowerCase().includes(term) ||
        message.message.toLowerCase().includes(term) ||
        message.user.full_name.toLowerCase().includes(term) ||
        message.user.email.toLowerCase().includes(term) ||
        (message.user.company ?? '').toLowerCase().includes(term)
      );
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((message) => message.status === this.statusFilter);
    }

    if (this.dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (this.dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter((message) => new Date(message.created_at) >= filterDate);
    }

    this.filteredMessages = filtered;
  }

  statusLabel(status: MessageStatus): string {
    const labels: Record<MessageStatus, string> = {
      pending: 'Pendiente',
      sent: 'Enviado',
      delivered: 'Entregado',
      failed: 'Fallido'
    };

    return labels[status];
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}

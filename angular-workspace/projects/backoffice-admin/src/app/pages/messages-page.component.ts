import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminSmsMessage, SmsMessageStatus, SmsService } from '@sms-fortuna/shared';

type StatusFilter = SmsMessageStatus | 'all';

@Component({
  selector: 'bo-messages-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages-page.component.html',
  styleUrl: './messages-page.component.scss'
})
export class MessagesPageComponent implements OnInit {
  private readonly smsService = inject(SmsService);

  messages: AdminSmsMessage[] = [];
  filteredMessages: AdminSmsMessage[] = [];
  loading = true;
  errorMessage = '';
  searchTerm = '';
  statusFilter: StatusFilter = 'all';

  get stats() {
    return {
      total: this.messages.length,
      pending: this.messages.filter((message) => message.status === 'pending').length,
      sent: this.messages.filter((message) => message.status === 'sent').length,
      delivered: this.messages.filter((message) => message.status === 'delivered').length,
      failed: this.messages.filter((message) => message.status === 'failed').length
    };
  }

  async ngOnInit(): Promise<void> {
    await this.loadMessages();
  }

  async loadMessages(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.messages = await this.smsService.listAdminMessages({ status: this.statusFilter });
      this.applyFilters();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar los mensajes. Verifica permisos de administrador.';
      this.messages = [];
      this.filteredMessages = [];
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    let filtered = [...this.messages];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();

      filtered = filtered.filter((message) =>
        message.recipient.toLowerCase().includes(term) ||
        message.message.toLowerCase().includes(term) ||
        this.clientName(message).toLowerCase().includes(term) ||
        this.clientEmail(message).toLowerCase().includes(term) ||
        (message.profile?.razon_social ?? '').toLowerCase().includes(term) ||
        (message.profile?.ruc ?? '').toLowerCase().includes(term)
      );
    }

    this.filteredMessages = filtered;
  }

  statusLabel(status: SmsMessageStatus): string {
    const labels: Record<SmsMessageStatus, string> = {
      pending: 'Pendiente',
      sent: 'Enviado',
      delivered: 'Entregado',
      failed: 'Fallido'
    };

    return labels[status];
  }

  async onStatusFilterChange(): Promise<void> {
    await this.loadMessages();
  }

  clientName(message: AdminSmsMessage): string {
    return message.profile?.full_name
      || message.profile?.email
      || 'Cliente sin nombre';
  }

  clientEmail(message: AdminSmsMessage): string {
    return message.profile?.email || '-';
  }

  clientCompany(message: AdminSmsMessage): string | null {
    if (message.profile?.razon_social && message.profile?.ruc) {
      return `${message.profile.razon_social} / ${message.profile.ruc}`;
    }

    return message.profile?.razon_social || message.profile?.ruc || null;
  }

  provider(message: AdminSmsMessage): string {
    return message.provider_response?.provider
      || message.provider_response?.provider_name
      || (this.isTestMode(message) ? 'test' : '-');
  }

  isTestMode(message: AdminSmsMessage): boolean {
    return message.provider_response?.test_mode === true;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }

  formatCost(value: number): string {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
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

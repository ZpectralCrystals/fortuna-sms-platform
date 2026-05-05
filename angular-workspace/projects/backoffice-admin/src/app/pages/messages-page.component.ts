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
  dateFrom = '';
  dateTo = '';
  selectedMessage: AdminSmsMessage | null = null;
  readonly messageLimit = 100;

  get stats() {
    return {
      total: this.messages.length,
      sent: this.messages.filter((message) => message.status === 'sent').length,
      failed: this.messages.filter((message) => message.status === 'failed').length,
      consumedSms: this.messages
        .filter((message) => message.status === 'sent' || message.status === 'delivered')
        .reduce((total, message) => total + message.segments, 0),
      totalCost: this.messages.reduce((total, message) => total + message.cost, 0)
    };
  }

  async ngOnInit(): Promise<void> {
    await this.loadMessages();
  }

  async loadMessages(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.messages = await this.smsService.listAdminMessages({
        status: this.statusFilter,
        dateFrom: this.dateFrom || null,
        dateTo: this.dateTo || null,
        limit: this.messageLimit
      });
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

  async onDateFilterChange(): Promise<void> {
    await this.loadMessages();
  }

  openDetail(message: AdminSmsMessage): void {
    this.selectedMessage = message;
  }

  closeDetail(): void {
    this.selectedMessage = null;
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
      || message.attempt?.provider
      || 'No registrado';
  }

  isTestMode(message: AdminSmsMessage): boolean {
    return message.provider_response?.test_mode === true;
  }

  modeLabel(message: AdminSmsMessage): string {
    if (message.provider_response?.test_mode === true) {
      return 'Test';
    }

    if (message.provider_response?.test_mode === false) {
      return 'Real';
    }

    return 'No registrado';
  }

  errorLabel(message: AdminSmsMessage): string {
    return message.error_message || message.attempt?.error_message || '-';
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }

  formatCost(value: number): string {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
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

  providerResponseJson(message: AdminSmsMessage): string {
    return this.toPrettyJson(message.provider_response);
  }

  attemptResponseJson(message: AdminSmsMessage): string {
    return this.toPrettyJson(message.attempt?.provider_response ?? null);
  }

  private toPrettyJson(value: unknown): string {
    if (!value || typeof value !== 'object') {
      return 'Sin datos';
    }

    return JSON.stringify(this.sanitizeSensitiveData(value), null, 2);
  }

  private sanitizeSensitiveData(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeSensitiveData(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const sensitiveKeys = ['token', 'password', 'authorization', 'api_key', 'apikey', 'secret', `service_${'role'}`];
    const result: Record<string, unknown> = {};

    for (const [key, entryValue] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase().replace(/[-\s]/g, '_');
      result[key] = sensitiveKeys.some((sensitiveKey) => normalizedKey.includes(sensitiveKey))
        ? '[oculto]'
        : this.sanitizeSensitiveData(entryValue);
    }

    return result;
  }
}

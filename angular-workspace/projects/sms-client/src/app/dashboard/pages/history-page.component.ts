import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientSmsMessage, SmsMessageStatus, SmsService } from '@sms-fortuna/shared';

type StatusFilter = SmsMessageStatus | 'all';

@Component({
  selector: 'sms-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history-page.component.html',
  styleUrl: './history-page.component.scss'
})
export class HistoryPageComponent implements OnInit {
  private readonly smsService = inject(SmsService);

  messages: ClientSmsMessage[] = [];
  searchTerm = '';
  statusFilter: StatusFilter = 'all';
  dateFrom = '';
  dateTo = '';
  loading = true;
  errorMessage = '';
  selectedMessage: ClientSmsMessage | null = null;
  readonly messageLimit = 100;

  async ngOnInit(): Promise<void> {
    await this.fetchMessages();
  }

  get filteredMessages(): ClientSmsMessage[] {
    let filtered = this.messages;

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((message) => message.status === this.statusFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter((message) =>
        message.recipient.toLowerCase().includes(term) ||
        message.message.toLowerCase().includes(term)
      );
    }

    if (this.dateFrom) {
      filtered = filtered.filter((message) => message.created_at >= `${this.dateFrom}T00:00:00`);
    }

    if (this.dateTo) {
      filtered = filtered.filter((message) => message.created_at <= `${this.dateTo}T23:59:59.999`);
    }

    return filtered;
  }

  statusText(status: SmsMessageStatus): string {
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

  statusIconClass(status: SmsMessageStatus): string {
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

  statusBadgeClass(status: SmsMessageStatus): string {
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
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  }

  formatDate(value: string | null): string {
    if (!value) return '-';

    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(value: string | null): string {
    if (!value) return '-';

    return new Date(value).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  exportToCSV(): void {
    const headers = ['Fecha', 'Teléfono', 'Mensaje', 'Estado', 'Segmentos', 'Costo', 'Proveedor'];
    const rows = this.filteredMessages.map((message) => [
      new Date(message.created_at).toLocaleString('es-PE'),
      message.recipient,
      message.message.replace(/,/g, ';'),
      this.statusText(message.status),
      String(message.segments),
      `S/ ${this.formatCurrency(message.cost)}`,
      this.provider(message)
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

  openDetail(message: ClientSmsMessage): void {
    this.selectedMessage = message;
  }

  closeDetail(): void {
    this.selectedMessage = null;
  }

  provider(message: ClientSmsMessage): string {
    return message.provider_response?.provider
      || message.provider_response?.provider_name
      || message.attempt?.provider
      || 'No registrado';
  }

  modeLabel(message: ClientSmsMessage): string {
    if (message.provider_response?.test_mode === true) return 'Test';
    if (message.provider_response?.test_mode === false) return 'Real';
    return 'No registrado';
  }

  providerResponseJson(message: ClientSmsMessage): string {
    return this.toPrettyJson(message.provider_response);
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

  private async fetchMessages(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.messages = await this.smsService.listMyMessages(this.messageLimit);
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar tu historial de SMS.';
      this.messages = [];
    } finally {
      this.loading = false;
    }
  }
}

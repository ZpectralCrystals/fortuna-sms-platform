import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiKeysService, BackofficeApiKey } from '@sms-fortuna/shared';

type ApiKeyStatusFilter = 'all' | 'active' | 'revoked' | 'expired';

@Component({
  selector: 'bo-api-keys-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-keys-page.component.html',
  styleUrl: './api-keys-page.component.scss'
})
export class ApiKeysPageComponent implements OnInit {
  private readonly apiKeysService = inject(ApiKeysService);

  apiKeys: BackofficeApiKey[] = [];
  loading = true;
  errorMessage = '';
  message = '';
  searchTerm = '';
  statusFilter: ApiKeyStatusFilter = 'all';
  revokingId = '';

  async ngOnInit(): Promise<void> {
    await this.loadApiKeys();
  }

  get filteredApiKeys(): BackofficeApiKey[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.apiKeys.filter((key) => {
      const status = this.statusValue(key);
      const matchesStatus = this.statusFilter === 'all' || status === this.statusFilter;
      const matchesSearch = !search ||
        key.name.toLowerCase().includes(search) ||
        key.keyPrefix.toLowerCase().includes(search) ||
        key.clientEmail.toLowerCase().includes(search) ||
        (key.clientName ?? '').toLowerCase().includes(search) ||
        (key.clientCompany ?? '').toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }

  get activeCount(): number {
    return this.apiKeys.filter((key) => this.statusValue(key) === 'active').length;
  }

  get revokedCount(): number {
    return this.apiKeys.filter((key) => this.statusValue(key) === 'revoked').length;
  }

  get usedCount(): number {
    return this.apiKeys.filter((key) => Boolean(key.lastUsedAt)).length;
  }

  async loadApiKeys(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.apiKeys = await this.apiKeysService.listBackoffice();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar las API Keys.';
      this.apiKeys = [];
    } finally {
      this.loading = false;
    }
  }

  async revokeApiKey(key: BackofficeApiKey): Promise<void> {
    if (this.statusValue(key) !== 'active' || !window.confirm(`Revocar API Key "${key.name}" de ${key.clientEmail}?`)) {
      return;
    }

    this.revokingId = key.id;
    this.message = '';
    this.errorMessage = '';

    try {
      await this.apiKeysService.adminRevoke(key.id);
      this.message = 'API Key revocada.';
      await this.loadApiKeys();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo revocar la API Key.';
    } finally {
      this.revokingId = '';
    }
  }

  statusLabel(key: BackofficeApiKey): string {
    const status = this.statusValue(key);
    if (status === 'active') return 'Activa';
    if (status === 'expired') return 'Expirada';
    return 'Revocada';
  }

  statusClass(key: BackofficeApiKey): string {
    return `status-pill ${this.statusValue(key)}`;
  }

  statusValue(key: BackofficeApiKey): ApiKeyStatusFilter {
    if (!key.isActive || key.revokedAt) {
      return 'revoked';
    }

    if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
      return 'expired';
    }

    return 'active';
  }

  clientName(key: BackofficeApiKey): string {
    return key.clientName || key.clientEmail || '-';
  }

  clientCompany(key: BackofficeApiKey): string {
    return key.clientCompany || '-';
  }

  scopesText(key: BackofficeApiKey): string {
    return key.scopes.length ? key.scopes.join(', ') : '-';
  }

  formatDate(value: string | null): string {
    if (!value) {
      return 'Nunca';
    }

    return new Date(value).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}

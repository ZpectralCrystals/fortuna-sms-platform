import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiKey, ApiKeysService, CreatedApiKey } from '@sms-fortuna/shared';

@Component({
  selector: 'sms-api-keys-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-keys-page.component.html',
  styleUrl: './api-keys-page.component.scss'
})
export class ApiKeysPageComponent implements OnInit {
  private readonly apiKeysService = inject(ApiKeysService);

  readonly exampleBody = `{
  "recipient": "956062256",
  "message": "Hola desde Fortuna SMS",
  "idempotency_key": "pedido-123"
}`;

  apiKeys: ApiKey[] = [];
  loading = true;
  creating = false;
  revokingId = '';
  message = '';
  errorMessage = '';
  showCreateModal = false;
  newKeyName = '';
  createdKey: CreatedApiKey | null = null;
  copiedValue = '';

  get createdKeyValue(): string {
    return this.createdKey?.value ?? '';
  }

  async ngOnInit(): Promise<void> {
    await this.loadApiKeys();
  }

  async loadApiKeys(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.apiKeys = await this.apiKeysService.list();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar las API Keys.';
      this.apiKeys = [];
    } finally {
      this.loading = false;
    }
  }

  openCreateModal(): void {
    this.newKeyName = '';
    this.createdKey = null;
    this.errorMessage = '';
    this.message = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.newKeyName = '';
    this.createdKey = null;
    this.creating = false;
  }

  async createApiKey(): Promise<void> {
    const name = this.newKeyName.trim();
    this.errorMessage = '';
    this.message = '';

    if (!name) {
      this.errorMessage = 'Ingresa un nombre para la API Key.';
      return;
    }

    this.creating = true;

    try {
      this.createdKey = await this.apiKeysService.create(name);
      this.message = 'API Key creada. Copia la clave ahora; no volveremos a mostrarla.';
      await this.loadApiKeys();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo crear la API Key.';
    } finally {
      this.creating = false;
    }
  }

  async revokeApiKey(key: ApiKey): Promise<void> {
    if (!key.isActive || !window.confirm(`Revocar API Key "${key.name}"?`)) {
      return;
    }

    this.revokingId = key.id;
    this.errorMessage = '';
    this.message = '';

    try {
      await this.apiKeysService.revoke(key.id);
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

  async copyValue(value: string): Promise<void> {
    await navigator.clipboard.writeText(value);
    this.copiedValue = value;
    window.setTimeout(() => {
      if (this.copiedValue === value) {
        this.copiedValue = '';
      }
    }, 1600);
  }

  statusLabel(key: ApiKey): string {
    if (key.revokedAt || !key.isActive) {
      return 'Revocada';
    }

    if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
      return 'Expirada';
    }

    return 'Activa';
  }

  statusClass(key: ApiKey): string {
    return this.statusLabel(key) === 'Activa' ? 'status--active' : 'status--inactive';
  }

  scopesText(key: ApiKey): string {
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

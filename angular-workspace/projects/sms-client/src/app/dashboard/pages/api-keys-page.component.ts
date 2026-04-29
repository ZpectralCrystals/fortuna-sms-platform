import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '@sms-fortuna/shared';

interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

@Component({
  selector: 'sms-api-keys-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="api-keys-page">
      <header class="api-keys-header">
        <div>
          <h1>API Keys</h1>
          <p>Administra tus claves de API para integración</p>
        </div>
        <button type="button" class="primary-button" (click)="openModal()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
          </svg>
          Nueva API Key
        </button>
      </header>

      <p *ngIf="noticeMessage" class="notice-message">
        {{ noticeMessage }}
      </p>

      <section class="info-box">
        <div class="info-layout">
          <svg class="info-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m16 18 6-6-6-6"></path>
            <path d="m8 6-6 6 6 6"></path>
          </svg>
          <div>
            <h2>Integración API</h2>
            <p class="info-copy">
              Usa tus API keys para enviar SMS desde tu aplicación de forma programática.
            </p>
            <div class="code-box">
              <p>Ejemplo de uso:</p>
              <pre>{{ apiExample }}</pre>
            </div>
          </div>
        </div>
      </section>

      <section class="keys-panel">
        <div class="keys-panel__header">
          <h2>Tus API Keys</h2>
        </div>

        <div class="keys-list">
          <div *ngIf="apiKeys.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 2l-2 2"></path>
              <path d="M15.5 7.5l2 2"></path>
              <path d="M11.7 11.3a6 6 0 1 1-2.99-2.99L21 20.59V22h-1.41Z"></path>
            </svg>
            <p>No tienes API keys aún</p>
            <button type="button" class="primary-button" (click)="openModal()">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              Crear primera API Key
            </button>
          </div>

          <article *ngFor="let apiKey of apiKeys" class="key-row">
            <div class="key-row__content">
              <div class="key-row__main">
                <div class="key-title">
                  <h3>{{ apiKey.name }}</h3>
                  <span [ngClass]="apiKey.is_active ? 'status status--active' : 'status status--inactive'">
                    {{ apiKey.is_active ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>

                <div class="key-value-row">
                  <code>
                    {{ isVisible(apiKey.id) ? apiKey.key : maskKey(apiKey.key) }}
                  </code>
                  <button
                    type="button"
                    class="mini-button"
                    [title]="isVisible(apiKey.id) ? 'Ocultar' : 'Mostrar'"
                    (click)="toggleVisibility(apiKey.id)"
                  >
                    <svg *ngIf="!isVisible(apiKey.id)" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg *ngIf="isVisible(apiKey.id)" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m3 3 18 18"></path>
                      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83"></path>
                      <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-5.3 6.18"></path>
                      <path d="M6.61 6.61A18.74 18.74 0 0 0 2 12s3.5 8 10 8a10.5 10.5 0 0 0 5.39-1.61"></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="mini-button"
                    title="Copiar"
                    (click)="copyToClipboard(apiKey)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" [ngClass]="copiedKeyId === apiKey.id ? 'copied' : ''">
                      <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>

                <p class="key-meta">
                  Creada:
                  {{ formatCreatedAt(apiKey.created_at) }}
                  <ng-container *ngIf="apiKey.last_used_at">
                    • Último uso:
                    {{ formatLastUsedAt(apiKey.last_used_at) }}
                  </ng-container>
                </p>
              </div>

              <button
                type="button"
                class="delete-button"
                title="Eliminar"
                (click)="requestDelete(apiKey.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 6h18"></path>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                </svg>
              </button>
            </div>
          </article>
        </div>
      </section>

      <div *ngIf="showModal" class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="modal-card">
          <h2>Crear nueva API Key</h2>

          <div class="modal-field">
            <label for="apiKeyName">Nombre de la API Key</label>
            <input
              id="apiKeyName"
              type="text"
              name="newKeyName"
              [(ngModel)]="newKeyName"
              placeholder="Ej: Producción, Testing, App Móvil"
              autofocus
            />
            <p>Dale un nombre descriptivo para identificar dónde se usará</p>
          </div>

          <p *ngIf="modalMessage" class="modal-message">
            {{ modalMessage }}
          </p>

          <div class="modal-actions">
            <button type="button" class="secondary-button" (click)="closeModal()">
              Cancelar
            </button>
            <button
              type="button"
              class="primary-submit"
              [disabled]="!newKeyName.trim()"
              (click)="showCreatePendingMessage()"
            >
              Crear
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    :host *,
    :host *::before,
    :host *::after {
      box-sizing: border-box;
    }

    svg {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    h1,
    h2,
    h3,
    p,
    pre {
      margin: 0;
    }

    .api-keys-page {
      display: grid;
      gap: 24px;
    }

    .api-keys-header {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }

    h1 {
      color: #111827;
      font-size: 30px;
      font-weight: 700;
      line-height: 36px;
    }

    .api-keys-header p {
      color: #4b5563;
      line-height: 24px;
      margin-top: 4px;
    }

    .primary-button,
    .primary-submit {
      align-items: center;
      background: #2563eb;
      border: 0;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-weight: 500;
      justify-content: center;
      line-height: 24px;
      padding: 8px 16px;
      transition: background-color 160ms ease, opacity 160ms ease;
    }

    .primary-button:hover,
    .primary-submit:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .primary-button svg {
      height: 20px;
      margin-right: 8px;
      width: 20px;
    }

    .primary-submit:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .notice-message,
    .modal-message {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      color: #1e40af;
      font-size: 14px;
      line-height: 20px;
      padding: 12px 16px;
    }

    .info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 24px;
    }

    .info-layout {
      align-items: flex-start;
      display: flex;
      gap: 12px;
    }

    .info-icon {
      color: #2563eb;
      flex-shrink: 0;
      height: 24px;
      margin-top: 4px;
      width: 24px;
    }

    .info-box h2 {
      color: #1e3a8a;
      font-size: 16px;
      font-weight: 700;
      line-height: 24px;
      margin-bottom: 8px;
    }

    .info-copy {
      color: #1e40af;
      font-size: 14px;
      line-height: 20px;
      margin-bottom: 12px;
    }

    .code-box {
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
    }

    .code-box p {
      color: #4b5563;
      font-size: 12px;
      line-height: 16px;
      margin-bottom: 8px;
    }

    pre {
      color: #1f2937;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 16px;
      overflow-x: auto;
      white-space: pre;
    }

    .keys-panel {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .keys-panel__header {
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 24px;
    }

    .keys-panel h2 {
      color: #111827;
      font-size: 18px;
      font-weight: 700;
      line-height: 28px;
    }

    .keys-list > * + * {
      border-top: 1px solid #e5e7eb;
    }

    .empty-state {
      padding: 48px 24px;
      text-align: center;
    }

    .empty-state > svg {
      color: #9ca3af;
      display: block;
      height: 48px;
      margin: 0 auto 12px;
      width: 48px;
    }

    .empty-state p {
      color: #4b5563;
      line-height: 24px;
      margin-bottom: 16px;
    }

    .key-row {
      padding: 16px 24px;
      transition: background-color 160ms ease;
    }

    .key-row:hover {
      background: #f9fafb;
    }

    .key-row__content {
      align-items: center;
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .key-row__main {
      flex: 1;
      min-width: 0;
    }

    .key-title {
      align-items: center;
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
    }

    .key-title h3 {
      color: #111827;
      font-weight: 500;
      line-height: 24px;
    }

    .status {
      border-radius: 999px;
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
      padding: 4px 8px;
    }

    .status--active {
      background: #dcfce7;
      color: #15803d;
    }

    .status--inactive {
      background: #f3f4f6;
      color: #374151;
    }

    .key-value-row {
      align-items: center;
      display: flex;
      gap: 8px;
      min-width: 0;
    }

    code {
      background: #f3f4f6;
      border-radius: 4px;
      color: #111827;
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 14px;
      line-height: 20px;
      max-width: 100%;
      overflow-x: auto;
      padding: 4px 12px;
    }

    .mini-button {
      background: transparent;
      border: 0;
      border-radius: 4px;
      color: #4b5563;
      cursor: pointer;
      padding: 4px;
      transition: background-color 160ms ease;
    }

    .mini-button:hover {
      background: #e5e7eb;
    }

    .mini-button svg {
      height: 16px;
      width: 16px;
    }

    .mini-button svg.copied {
      color: #16a34a;
    }

    .key-meta {
      color: #6b7280;
      font-size: 12px;
      line-height: 16px;
      margin-top: 8px;
    }

    .delete-button {
      background: transparent;
      border: 0;
      border-radius: 8px;
      color: #dc2626;
      cursor: pointer;
      margin-left: 16px;
      padding: 8px;
      transition: background-color 160ms ease;
    }

    .delete-button:hover {
      background: #fef2f2;
    }

    .delete-button svg {
      height: 20px;
      width: 20px;
    }

    .modal-backdrop {
      align-items: center;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      inset: 0;
      justify-content: center;
      padding: 16px;
      position: fixed;
      z-index: 50;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25);
      max-width: 448px;
      padding: 24px;
      width: 100%;
    }

    .modal-card h2 {
      color: #111827;
      font-size: 24px;
      font-weight: 700;
      line-height: 32px;
      margin-bottom: 16px;
    }

    .modal-field {
      margin-bottom: 24px;
    }

    label {
      color: #374151;
      display: block;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      margin-bottom: 8px;
    }

    input {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      color: #111827;
      display: block;
      font: inherit;
      line-height: 24px;
      padding: 8px 16px;
      width: 100%;
    }

    input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
      outline: none;
    }

    .modal-field p {
      color: #6b7280;
      font-size: 12px;
      line-height: 16px;
      margin-top: 8px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .secondary-button,
    .primary-submit {
      flex: 1;
      padding: 8px 16px;
    }

    .secondary-button {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      color: #374151;
      cursor: pointer;
      font: inherit;
      font-weight: 500;
      line-height: 24px;
      transition: background-color 160ms ease;
    }

    .secondary-button:hover {
      background: #f9fafb;
    }

    @media (max-width: 640px) {
      .api-keys-header,
      .key-row__content,
      .key-title,
      .key-value-row,
      .modal-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .primary-button {
        width: 100%;
      }

      .delete-button {
        margin-left: 0;
        width: max-content;
      }
    }
  `]
})
export class ApiKeysPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  readonly apiExample = `fetch('https://TU_SUPABASE_URL/functions/v1/send-sms', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TU_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '+51987654321',
    message: 'Tu mensaje aquí'
  })
})`;

  apiKeys: ApiKeyRecord[] = [];
  showModal = false;
  newKeyName = '';
  visibleKeys = new Set<string>();
  copiedKeyId: string | null = null;
  noticeMessage = '';
  modalMessage = '';

  ngOnInit(): void {
    void this.fetchApiKeys();
  }

  openModal(): void {
    this.showModal = true;
    this.newKeyName = '';
    this.modalMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.newKeyName = '';
    this.modalMessage = '';
  }

  showCreatePendingMessage(): void {
    this.modalMessage = 'La generación segura de API keys se conectará en la siguiente fase.';
  }

  requestDelete(_id: string): void {
    if (!window.confirm('¿Estás seguro de eliminar esta API key?')) {
      return;
    }

    this.noticeMessage = 'La revocación segura de API keys se conectará en la siguiente fase.';
  }

  toggleVisibility(id: string): void {
    const next = new Set(this.visibleKeys);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    this.visibleKeys = next;
  }

  isVisible(id: string): boolean {
    return this.visibleKeys.has(id);
  }

  async copyToClipboard(apiKey: ApiKeyRecord): Promise<void> {
    try {
      await navigator.clipboard.writeText(apiKey.key);
      this.copiedKeyId = apiKey.id;
      window.setTimeout(() => {
        this.copiedKeyId = null;
      }, 2000);
    } catch {
      this.noticeMessage = 'No se pudo copiar la API key.';
    }
  }

  maskKey(key: string): string {
    if (key.length <= 12) {
      return key;
    }

    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  formatCreatedAt(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatLastUsedAt(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private async fetchApiKeys(): Promise<void> {
    try {
      const { data: sessionData } = await this.supabase.instance.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        this.apiKeys = [];
        return;
      }

      const { data, error } = await this.supabase.instance
        .from('api_keys')
        .select('id, user_id, name, key, is_active, created_at, last_used_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.apiKeys = [];
        return;
      }

      this.apiKeys = ((data as ApiKeyRecord[] | null) ?? []).map((apiKey) => ({
        ...apiKey,
        name: apiKey.name ?? '',
        key: apiKey.key ?? '',
        is_active: Boolean(apiKey.is_active),
        last_used_at: apiKey.last_used_at ?? null
      }));
    } catch {
      this.apiKeys = [];
    }
  }
}

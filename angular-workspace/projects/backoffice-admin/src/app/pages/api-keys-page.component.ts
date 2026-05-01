import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ApiKeyUser {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
}

interface ApiKeyRecord {
  id: string;
  user_id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  users: {
    full_name: string;
    email: string;
    company: string | null;
  };
}

@Component({
  selector: 'bo-api-keys-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="loading-text">Cargando API keys...</div>
    </div>

    <div *ngIf="!loading" class="api-keys-page">
      <div class="page-header">
        <div class="title-group">
          <div class="title-icon">
            <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15.5 7.5 1 1" />
              <path d="m12 11 1.5 1.5" />
              <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
              <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div>
            <h1>API Keys</h1>
            <p>Administrar claves de acceso a la API</p>
          </div>
        </div>

        <button type="button" class="new-key-button" (click)="openCreateModal()">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Nueva API Key
        </button>
      </div>

      <div class="info-box">
        <div class="info-content">
          <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <div>
            <p class="info-title">Información Importante</p>
            <p class="info-text">
              Las API keys permiten a los clientes enviar SMS a través de la plataforma. Guarda las claves de forma
              segura ya que no podrás verlas nuevamente después de cerrar la ventana inicial.
            </p>
          </div>
        </div>
      </div>

      <p *ngIf="message" class="notice-message">{{ message }}</p>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Nombre</th>
              <th>API Key</th>
              <th>Estado</th>
              <th>Último Uso</th>
              <th>Expira</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="apiKeys.length === 0">
              <td class="empty-cell" colspan="7">No hay API keys creadas</td>
            </tr>

            <tr *ngFor="let item of apiKeys" class="api-key-row">
              <td>
                <div class="client-name">{{ item.users.full_name }}</div>
                <div class="client-email">{{ item.users.email }}</div>
              </td>
              <td>
                <div class="key-name">{{ item.key_name }}</div>
              </td>
              <td>
                <div class="key-cell">
                  <code>{{ visibleKeys.has(item.id) ? item.api_key : maskApiKey(item.api_key) }}</code>
                  <button type="button" class="icon-button" (click)="showBlockedMessage()" aria-label="Ver API key">
                    <svg *ngIf="!visibleKeys.has(item.id)" class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg *ngIf="visibleKeys.has(item.id)" class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m15 18-.722-3.25" />
                      <path d="M2 8a10.645 10.645 0 0 0 20 0" />
                      <path d="m20 15-1.726-2.05" />
                      <path d="m4 15 1.726-2.05" />
                      <path d="m9 18 .722-3.25" />
                    </svg>
                  </button>
                  <button type="button" class="icon-button" (click)="showBlockedMessage()" aria-label="Copiar API key">
                    <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </button>
                </div>
              </td>
              <td>
                <button type="button" class="status-pill" [class.active]="item.is_active" [class.inactive]="!item.is_active" (click)="showBlockedMessage()">
                  {{ item.is_active ? 'Activa' : 'Inactiva' }}
                </button>
              </td>
              <td class="date-cell">{{ formatDate(item.last_used_at) }}</td>
              <td class="date-cell">{{ item.expires_at ? formatDate(item.expires_at) : 'Nunca' }}</td>
              <td>
                <button type="button" class="trash-button" (click)="showBlockedMessage()" aria-label="Eliminar API key">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4c0-.6.4-1 1-1h6c.6 0 1 .4 1 1v2" />
                    <path d="M19 6 18 20c-.1.6-.5 1-1 1H7c-.5 0-.9-.4-1-1L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="showModal" class="modal-backdrop">
        <div class="modal-card create-card">
          <h2>Crear Nueva API Key</h2>
          <form class="create-form" novalidate (ngSubmit)="handleCreateApiKey()">
            <div class="field">
              <label for="user_id">Cliente</label>
              <select id="user_id" name="user_id" [(ngModel)]="newKeyForm.user_id" required>
                <option value="">Seleccionar cliente</option>
                <option *ngFor="let user of users" [value]="user.id">
                  {{ user.full_name }} ({{ user.email }})
                </option>
              </select>
            </div>

            <div class="field">
              <label for="key_name">Nombre de la Key</label>
              <input
                id="key_name"
                type="text"
                name="key_name"
                [(ngModel)]="newKeyForm.key_name"
                required
                placeholder="Producción, Desarrollo, etc."
              />
            </div>

            <div class="field">
              <label for="expires_in_days">Expiración (días)</label>
              <input
                id="expires_in_days"
                type="number"
                min="0"
                name="expires_in_days"
                [(ngModel)]="newKeyForm.expires_in_days"
                placeholder="0 = nunca expira"
              />
              <p>0 = la key nunca expira</p>
            </div>

            <p *ngIf="modalMessage" class="modal-message">{{ modalMessage }}</p>

            <div class="modal-actions">
              <button type="button" class="secondary-button" (click)="closeCreateModal()">Cancelar</button>
              <button type="submit" class="primary-button">Crear API Key</button>
            </div>
          </form>
        </div>
      </div>

      <div *ngIf="showKeyModal" class="modal-backdrop">
        <div class="modal-card key-card">
          <div class="created-header">
            <div class="created-icon">
              <svg class="created-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
            </div>
            <div>
              <h2>API Key Creada</h2>
              <p>Guarda esta clave de forma segura</p>
            </div>
          </div>

          <div class="key-display">
            <div class="key-display-header">
              <label>API Key</label>
              <button type="button" (click)="showBlockedMessage()">
                <svg class="copy-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                Copiar
              </button>
            </div>
            <code>{{ newApiKey }}</code>
          </div>

          <div class="warning-box">
            <p>
              <strong>Importante:</strong> Esta es la única vez que verás esta clave. Asegúrate de copiarla y
              guardarla en un lugar seguro.
            </p>
          </div>

          <button type="button" class="understood-button" (click)="closeKeyModal()">Entendido</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 16rem;
    }

    .loading-text {
      color: #475569;
    }

    .api-keys-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .title-icon {
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.75rem;
      color: #ffffff;
      background: linear-gradient(135deg, #10b981, #059669);
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }

    .icon-lg {
      width: 1.5rem;
      height: 1.5rem;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    h1 {
      color: #0f172a;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 700;
    }

    .title-group p {
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .new-key-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border: 0;
      border-radius: 0.5rem;
      background: #059669;
      color: #ffffff;
      cursor: pointer;
      padding: 0.5rem 1rem;
      font: inherit;
      transition: background-color 150ms ease;
    }

    .new-key-button:hover {
      background: #047857;
    }

    .button-icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .info-box {
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      background: #eff6ff;
      padding: 1rem;
    }

    .info-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .info-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: #2563eb;
      flex: 0 0 auto;
      margin-top: 0.125rem;
    }

    .info-content div {
      color: #1e3a8a;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .info-title {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .notice-message,
    .modal-message {
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      background: #eff6ff;
      color: #1e40af;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .modal-message {
      margin-top: 0.5rem;
    }

    .table-card {
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    th {
      padding: 0.75rem 1.5rem;
      color: #334155;
      font-size: 0.75rem;
      line-height: 1rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    tbody {
      background: #ffffff;
    }

    tbody tr {
      border-bottom: 1px solid #e2e8f0;
    }

    tbody tr:last-child {
      border-bottom: 0;
    }

    .api-key-row {
      transition: background-color 150ms ease;
    }

    .api-key-row:hover {
      background: #f8fafc;
    }

    td {
      padding: 1rem 1.5rem;
      vertical-align: middle;
    }

    .empty-cell {
      padding: 3rem 1.5rem;
      color: #64748b;
      text-align: center;
    }

    .client-name,
    .key-name {
      color: #0f172a;
      font-weight: 500;
    }

    .client-email,
    .date-cell {
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .key-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    code {
      color: #334155;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .icon-button,
    .trash-button {
      border: 0;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
      transition: color 150ms ease;
    }

    .icon-button:hover {
      color: #475569;
    }

    .trash-button {
      color: #dc2626;
    }

    .trash-button:hover {
      color: #991b1b;
    }

    .action-icon {
      display: block;
      width: 1rem;
      height: 1rem;
    }

    .status-pill {
      border: 0;
      border-radius: 9999px;
      cursor: pointer;
      padding: 0.25rem 0.75rem;
      font: inherit;
      font-size: 0.75rem;
      line-height: 1rem;
      font-weight: 500;
      transition: background-color 150ms ease;
    }

    .status-pill.active {
      background: #dcfce7;
      color: #166534;
    }

    .status-pill.active:hover {
      background: #bbf7d0;
    }

    .status-pill.inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-pill.inactive:hover {
      background: #fecaca;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgb(0 0 0 / 0.5);
      padding: 1rem;
    }

    .modal-card {
      width: 100%;
      background: #ffffff;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .create-card {
      max-width: 28rem;
    }

    .key-card {
      max-width: 42rem;
    }

    .modal-card h2 {
      color: #0f172a;
      font-size: 1.25rem;
      line-height: 1.75rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .create-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .field label {
      display: block;
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .field input,
    .field select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      color: #0f172a;
      font: inherit;
      padding: 0.5rem 1rem;
      outline: none;
    }

    .field input:focus,
    .field select:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #10b981;
    }

    .field input::placeholder {
      color: #64748b;
      opacity: 1;
    }

    .field p {
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
      margin-top: 0.25rem;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      padding-top: 1rem;
    }

    .secondary-button,
    .primary-button,
    .understood-button {
      border-radius: 0.5rem;
      cursor: pointer;
      font: inherit;
      padding: 0.5rem 1rem;
      transition: background-color 150ms ease;
    }

    .secondary-button,
    .primary-button {
      flex: 1 1 0;
    }

    .secondary-button {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
    }

    .secondary-button:hover {
      background: #f8fafc;
    }

    .primary-button,
    .understood-button {
      border: 0;
      background: #059669;
      color: #ffffff;
    }

    .primary-button:hover,
    .understood-button:hover {
      background: #047857;
    }

    .created-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .created-icon {
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      background: #dcfce7;
      color: #16a34a;
    }

    .created-icon-svg {
      width: 1.5rem;
      height: 1.5rem;
    }

    .created-header h2 {
      margin: 0;
    }

    .created-header p {
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .key-display {
      border-radius: 0.5rem;
      background: #f8fafc;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .key-display-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .key-display-header label {
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
    }

    .key-display-header button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      border: 0;
      background: transparent;
      color: #059669;
      cursor: pointer;
      font: inherit;
      font-size: 0.875rem;
      line-height: 1.25rem;
      padding: 0;
    }

    .key-display-header button:hover {
      color: #047857;
    }

    .copy-small {
      width: 1rem;
      height: 1rem;
    }

    .key-display code {
      display: block;
      color: #0f172a;
      font-size: 0.875rem;
      line-height: 1.25rem;
      overflow-wrap: anywhere;
    }

    .warning-box {
      border: 1px solid #fde68a;
      border-radius: 0.5rem;
      background: #fffbeb;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .warning-box p {
      color: #78350f;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .understood-button {
      width: 100%;
    }

    @media (max-width: 768px) {
      .page-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .new-key-button {
        justify-content: center;
        width: 100%;
      }

      .table-card {
        overflow-x: auto;
      }
    }
  `]
})
export class ApiKeysPageComponent implements OnInit {
  readonly blockedMessage = 'La gestión segura de API Keys se conectará cuando exista backend y base de datos definidos.';

  apiKeys: ApiKeyRecord[] = [];
  users: ApiKeyUser[] = [];
  loading = true;
  showModal = false;
  showKeyModal = false;
  newApiKey = '';
  visibleKeys = new Set<string>();
  message = '';
  modalMessage = '';
  newKeyForm = {
    user_id: '',
    key_name: '',
    expires_in_days: '0'
  };

  ngOnInit(): void {
    this.apiKeys = [];
    this.users = [];
    this.loading = false;
  }

  openCreateModal(): void {
    this.message = '';
    this.modalMessage = '';
    this.showModal = true;
  }

  closeCreateModal(): void {
    this.showModal = false;
    this.modalMessage = '';
    this.newKeyForm = {
      user_id: '',
      key_name: '',
      expires_in_days: '0'
    };
  }

  handleCreateApiKey(): void {
    this.modalMessage = this.blockedMessage;
    this.message = this.blockedMessage;
  }

  closeKeyModal(): void {
    this.showKeyModal = false;
    this.newApiKey = '';
  }

  showBlockedMessage(): void {
    this.message = this.blockedMessage;
  }

  maskApiKey(key: string): string {
    return `${key.substring(0, 8)}${'•'.repeat(32)}${key.substring(key.length - 8)}`;
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

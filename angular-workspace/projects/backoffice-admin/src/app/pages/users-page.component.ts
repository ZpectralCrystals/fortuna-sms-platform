import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from '../../../../shared/src/lib/services/supabase.service';

interface BackofficeUser {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  phone: string | null;
  sms_balance: number;
  is_active: boolean;
  created_at: string | null;
}

@Component({
  selector: 'bo-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!loading" class="users-page">
      <p *ngIf="message" class="message-box">
        {{ message }}
      </p>

      <div class="toolbar">
        <div class="search-box">
          <svg
            class="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            name="searchTerm"
            [(ngModel)]="searchTerm"
            placeholder="Buscar usuarios..."
          />
        </div>

        <button
          type="button"
          class="add-button"
          (click)="openAddModal()"
        >
          <svg
            class="button-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" x2="19" y1="8" y2="14" />
            <line x1="22" x2="16" y1="11" y2="11" />
          </svg>
          <span>Agregar Usuario</span>
        </button>
      </div>

      <div class="table-card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Empresa</th>
                <th>Teléfono</th>
                <th>Balance SMS</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers">
                <td>
                  <div>
                    <div class="user-name">{{ user.full_name || '-' }}</div>
                    <div class="user-email">{{ user.email || '-' }}</div>
                  </div>
                </td>
                <td class="muted-cell">{{ user.company || '-' }}</td>
                <td class="muted-cell">{{ user.phone || '-' }}</td>
                <td>
                  <div class="sms-balance">
                    <svg
                      class="sms-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{{ formatNumber(user.sms_balance) }}</span>
                  </div>
                </td>
                <td>
                  <span class="status-badge" [class.active]="user.is_active" [class.inactive]="!user.is_active">
                    {{ user.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    class="status-button"
                    [class.deactivate]="user.is_active"
                    [class.activate]="!user.is_active"
                    (click)="showActivationNotice()"
                  >
                    <ng-container *ngIf="user.is_active; else activateIcon">
                      <svg
                        class="row-button-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                        <line x1="12" x2="12" y1="2" y2="12" />
                      </svg>
                      <span>Desactivar</span>
                    </ng-container>
                    <ng-template #activateIcon>
                      <svg
                        class="row-button-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 2v10" />
                        <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
                      </svg>
                      <span>Activar</span>
                    </ng-template>
                  </button>
                </td>
              </tr>

              <tr *ngIf="filteredUsers.length === 0">
                <td colspan="6" class="empty-cell">
                  No hay usuarios registrados
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="showAddModal" class="modal-backdrop">
        <div class="modal-card">
          <h3>Agregar Nuevo Usuario</h3>
          <form class="modal-form" (ngSubmit)="handleAddUser()">
            <div>
              <label>Nombre completo</label>
              <input
                type="text"
                required
                name="full_name"
                [(ngModel)]="newUser.full_name"
              />
            </div>

            <div>
              <label>Email</label>
              <input
                type="email"
                required
                name="email"
                [(ngModel)]="newUser.email"
              />
            </div>

            <div>
              <label>Empresa</label>
              <input
                type="text"
                name="company"
                [(ngModel)]="newUser.company"
              />
            </div>

            <div>
              <label>Teléfono</label>
              <input
                type="tel"
                name="phone"
                [(ngModel)]="newUser.phone"
              />
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="cancel-button"
                (click)="closeAddModal()"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="create-button"
              >
                Crear Usuario
              </button>
            </div>
          </form>
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

    .spinner {
      width: 3rem;
      height: 3rem;
      border-radius: 9999px;
      border-bottom: 2px solid #2563eb;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .users-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      color: #0f172a;
    }

    .message-box {
      margin: 0;
      padding: 0.75rem 1rem;
      color: #1d4ed8;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .toolbar {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .search-box {
      position: relative;
      flex: 1;
      width: 100%;
      max-width: 28rem;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      width: 1.25rem;
      height: 1.25rem;
      color: #94a3b8;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .search-box input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem 1rem 0.5rem 2.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      color: #0f172a;
      font: inherit;
      outline: none;
    }

    .search-box input:focus,
    .modal-form input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .search-box input::placeholder {
      color: #64748b;
      opacity: 1;
    }

    .add-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border: 0;
      background: #2563eb;
      color: #ffffff;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 150ms ease;
      font: inherit;
    }

    .add-button:hover {
      background: #1d4ed8;
    }

    .button-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 auto;
    }

    .table-card {
      background: #ffffff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .table-wrap {
      overflow-x: auto;
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
      text-align: left;
      color: #475569;
      font-size: 0.75rem;
      line-height: 1rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    tbody tr {
      border-bottom: 1px solid #e2e8f0;
      transition: background-color 150ms ease;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    tbody tr:last-child {
      border-bottom: 0;
    }

    td {
      padding: 1rem 1.5rem;
      vertical-align: middle;
    }

    .user-name {
      color: #0f172a;
      font-weight: 500;
    }

    .user-email {
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .muted-cell {
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .sms-balance {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sms-icon {
      width: 1rem;
      height: 1rem;
      color: #2563eb;
      flex: 0 0 auto;
    }

    .sms-balance span {
      color: #0f172a;
      font-weight: 600;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      line-height: 1rem;
      font-weight: 500;
    }

    .status-badge.active {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      border: 0;
      padding: 0.375rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .status-button.deactivate {
      background: #fee2e2;
      color: #b91c1c;
    }

    .status-button.deactivate:hover {
      background: #fecaca;
    }

    .status-button.activate {
      background: #dcfce7;
      color: #15803d;
    }

    .status-button.activate:hover {
      background: #bbf7d0;
    }

    .row-button-icon {
      width: 1rem;
      height: 1rem;
      flex: 0 0 auto;
    }

    .empty-cell {
      padding: 3rem 1.5rem;
      text-align: center;
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
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
      max-width: 28rem;
      background: #ffffff;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .modal-card h3 {
      margin: 0 0 1rem;
      color: #0f172a;
      font-size: 1.25rem;
      line-height: 1.75rem;
      font-weight: 700;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-form label {
      display: block;
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .modal-form input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      color: #0f172a;
      font: inherit;
      outline: none;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      padding-top: 1rem;
    }

    .cancel-button,
    .create-button {
      flex: 1;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 150ms ease;
      font: inherit;
    }

    .cancel-button {
      border: 1px solid #cbd5e1;
      color: #334155;
      background: #ffffff;
    }

    .cancel-button:hover {
      background: #f8fafc;
    }

    .create-button {
      border: 0;
      color: #ffffff;
      background: #2563eb;
    }

    .create-button:hover {
      background: #1d4ed8;
    }

    @media (min-width: 640px) {
      .toolbar {
        flex-direction: row;
        align-items: center;
      }
    }
  `]
})
export class UsersPageComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  users: BackofficeUser[] = [];
  loading = true;
  searchTerm = '';
  showAddModal = false;
  message = '';
  newUser = {
    email: '',
    full_name: '',
    company: '',
    phone: ''
  };

  get filteredUsers(): BackofficeUser[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.users;
    }

    return this.users.filter((user) =>
      (user.full_name ?? '').toLowerCase().includes(search) ||
      (user.email ?? '').toLowerCase().includes(search) ||
      (user.company ?? '').toLowerCase().includes(search)
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;

    try {
      const { data, error } = await this.supabaseService.instance
        .from('users')
        .select('id, email, full_name, company, phone, sms_balance, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.users = (data ?? []).map((user: any) => ({
        id: String(user.id ?? ''),
        email: String(user.email ?? ''),
        full_name: String(user.full_name ?? ''),
        company: typeof user.company === 'string' ? user.company : null,
        phone: typeof user.phone === 'string' ? user.phone : null,
        sms_balance: Number(user.sms_balance ?? 0),
        is_active: Boolean(user.is_active ?? false),
        created_at: typeof user.created_at === 'string' ? user.created_at : null
      }));
    } catch (error) {
      console.warn('Error loading users:', error);
      this.users = [];
    } finally {
      this.loading = false;
    }
  }

  openAddModal(): void {
    this.message = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  handleAddUser(): void {
    this.message = 'La creación segura de usuarios se conectará en la siguiente fase.';
    this.showAddModal = false;
    this.newUser = { email: '', full_name: '', company: '', phone: '' };
  }

  showActivationNotice(): void {
    this.message = 'La activación de usuarios se conectará en la siguiente fase.';
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }
}

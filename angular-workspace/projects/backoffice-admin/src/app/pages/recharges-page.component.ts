import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from '../../../../shared/src/lib/services/supabase.service';

type RechargeStatus = 'pending' | 'approved' | 'rejected';
type RechargeFilter = 'all' | RechargeStatus;

interface RechargeWithDetails {
  id: string;
  user_id: string;
  package_id: string;
  quantity: number;
  amount: number;
  payment_method: string;
  status: RechargeStatus;
  created_at: string;
  operation_code: string | null;
  user: {
    full_name: string;
    email: string;
    company: string | null;
  };
  package: {
    name: string;
  };
}

interface RechargeUser {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
}

interface SmsPackage {
  id: string;
  name: string;
  quantity: number;
  total_price: number;
}

@Component({
  selector: 'bo-recharges-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!loading" class="recharges-page">
      <p *ngIf="message" class="message-box">
        {{ message }}
      </p>

      <section class="inventory-card" [ngClass]="inventoryTone">
        <div class="inventory-content">
          <div class="inventory-main">
            <div class="inventory-icon-box">
              <svg
                class="inventory-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m7.5 4.27 9 5.15" />
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </div>
            <div>
              <p class="inventory-label">Inventario Global Disponible</p>
              <p class="inventory-value">{{ formatNumber(inventoryAvailable) }} SMS</p>
            </div>
          </div>

          <div *ngIf="inventoryAvailable < 1000" class="low-inventory-warning">
            <p>Inventario bajo - Comprar más SMS</p>
          </div>
        </div>
      </section>

      <section class="toolbar">
        <div class="filter-group">
          <svg
            class="filter-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <div class="filter-buttons">
            <button
              *ngFor="let item of filterOptions"
              type="button"
              class="filter-button"
              [class.active]="filter === item.value"
              (click)="filter = item.value"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="new-recharge-button"
          (click)="openCreateModal()"
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
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>Nueva Recarga</span>
        </button>
      </section>

      <section class="table-card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Paquete</th>
                <th>Cantidad</th>
                <th>Monto</th>
                <th>Método Pago</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Cód. Operación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let recharge of filteredRecharges">
                <td>
                  <div>
                    <div class="user-name">{{ recharge.user.full_name || '-' }}</div>
                    <div class="user-email">{{ recharge.user.email || '-' }}</div>
                    <div *ngIf="recharge.user.company" class="user-company">
                      {{ recharge.user.company }}
                    </div>
                  </div>
                </td>
                <td class="package-cell">{{ recharge.package.name || '-' }}</td>
                <td class="quantity-cell">{{ formatNumber(recharge.quantity) }} SMS</td>
                <td class="amount-cell">S/ {{ formatCurrency(recharge.amount) }}</td>
                <td class="payment-cell">{{ recharge.payment_method }}</td>
                <td class="date-cell">{{ formatDate(recharge.created_at) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="recharge.status">
                    {{ statusLabel(recharge.status) }}
                  </span>
                </td>
                <td>
                  <span *ngIf="recharge.operation_code; else noOperation" class="operation-badge">
                    {{ recharge.operation_code }}
                  </span>
                  <ng-template #noOperation>
                    <span class="muted-italic">No registrado</span>
                  </ng-template>
                </td>
                <td>
                  <div *ngIf="recharge.status === 'pending'; else processedState" class="action-group">
                    <button
                      type="button"
                      class="approve-button"
                      (click)="openApprovalModal(recharge)"
                    >
                      <svg class="row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span>Aprobar</span>
                    </button>
                    <button
                      type="button"
                      class="reject-button"
                      (click)="handleReject()"
                    >
                      <svg class="row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                      <span>Rechazar</span>
                    </button>
                  </div>
                  <ng-template #processedState>
                    <span class="processed-label">
                      <svg class="row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Procesado</span>
                    </span>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div *ngIf="filteredRecharges.length === 0" class="empty-state">
        <svg
          class="empty-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p>No hay recargas para mostrar</p>
      </div>

      <div *ngIf="showCreateModal" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Nueva Recarga</h3>
            <button
              type="button"
              class="modal-close"
              aria-label="Cerrar"
              (click)="closeCreateModal()"
            >
              <span>&times;</span>
            </button>
          </div>

          <form class="modal-form" (ngSubmit)="handleCreateRecharge()">
            <div>
              <label>Usuario *</label>
              <select
                required
                name="user_id"
                [(ngModel)]="newRecharge.user_id"
              >
                <option value="">Seleccione un usuario</option>
                <option *ngFor="let user of users" [value]="user.id">
                  {{ user.full_name }} ({{ user.email }}){{ user.company ? ' - ' + user.company : '' }}
                </option>
              </select>
            </div>

            <div>
              <label>Paquete *</label>
              <select
                required
                name="package_id"
                [(ngModel)]="newRecharge.package_id"
              >
                <option value="">Seleccione un paquete</option>
                <option *ngFor="let packageOption of packages" [value]="packageOption.id">
                  {{ packageOption.name }} - S/ {{ formatCurrency(packageOption.total_price) }}
                </option>
              </select>
            </div>

            <div>
              <label>Método de Pago *</label>
              <select
                required
                name="payment_method"
                [(ngModel)]="newRecharge.payment_method"
              >
                <option value="yape">Yape</option>
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                <option value="efectivo">Efectivo</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div class="note-box blue-note">
              <p>
                <strong>Nota:</strong> La recarga se creará con estado "Pendiente". Deberá aprobarla después de verificar el pago.
              </p>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="cancel-button"
                (click)="closeCreateModal()"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="create-button"
                [disabled]="submitting"
              >
                {{ submitting ? 'Creando...' : 'Crear Recarga' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div *ngIf="showApprovalModal && selectedRecharge" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Aprobar Recarga</h3>
            <button
              type="button"
              class="modal-close"
              aria-label="Cerrar"
              (click)="closeApprovalModal()"
            >
              <span>&times;</span>
            </button>
          </div>

          <div class="approval-info">
            <h4>Información de la Recarga</h4>
            <div class="info-list">
              <div class="info-row">
                <span>Cliente:</span>
                <strong>{{ selectedRecharge.user.full_name }}</strong>
              </div>
              <div class="info-row">
                <span>Paquete:</span>
                <strong>{{ selectedRecharge.package.name }}</strong>
              </div>
              <div class="info-row">
                <span>Cantidad SMS:</span>
                <strong>{{ formatNumber(selectedRecharge.quantity) }}</strong>
              </div>
              <div class="info-row">
                <span>Monto:</span>
                <strong>S/ {{ formatCurrency(selectedRecharge.amount) }}</strong>
              </div>
              <div class="info-row">
                <span>Método de Pago:</span>
                <strong>{{ selectedRecharge.payment_method }}</strong>
              </div>
            </div>
          </div>

          <form class="modal-form" (ngSubmit)="handleApprove()">
            <div>
              <label>Código de Operación Bancaria *</label>
              <input
                type="text"
                required
                name="operationCode"
                [(ngModel)]="operationCode"
                class="approval-input"
                placeholder="Ej: OP-123456789"
              />
              <p class="field-help">Ingrese el código de operación bancaria para verificar el pago</p>
            </div>

            <p *ngIf="approvalError" class="modal-error">
              {{ approvalError }}
            </p>

            <div class="note-box amber-note">
              <p>
                <strong>Importante:</strong> Verifique que el pago fue recibido antes de aprobar la recarga. El código de operación se guardará para conciliación bancaria.
              </p>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="cancel-button"
                (click)="closeApprovalModal()"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="approve-submit-button"
                [disabled]="submitting"
              >
                {{ submitting ? 'Aprobando...' : 'Aprobar Recarga' }}
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

    .recharges-page {
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

    .message-box.warning {
      color: #92400e;
      background: #fffbeb;
      border-color: #fde68a;
    }

    .inventory-card {
      padding: 1rem;
      border-radius: 0.75rem;
      border: 2px solid;
    }

    .inventory-card.danger {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .inventory-card.warning {
      background: #fffbeb;
      border-color: #fde68a;
    }

    .inventory-card.safe {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .inventory-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .inventory-main {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .inventory-icon-box {
      width: 3rem;
      height: 3rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .danger .inventory-icon-box {
      background: #fee2e2;
      color: #dc2626;
    }

    .warning .inventory-icon-box {
      background: #fef3c7;
      color: #d97706;
    }

    .safe .inventory-icon-box {
      background: #dcfce7;
      color: #16a34a;
    }

    .inventory-icon {
      width: 1.5rem;
      height: 1.5rem;
    }

    .inventory-label {
      margin: 0;
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
    }

    .inventory-value {
      margin: 0;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 700;
    }

    .danger .inventory-value {
      color: #b91c1c;
    }

    .warning .inventory-value {
      color: #b45309;
    }

    .safe .inventory-value {
      color: #15803d;
    }

    .low-inventory-warning {
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #991b1b;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
    }

    .low-inventory-warning p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 600;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: #475569;
      flex: 0 0 auto;
    }

    .filter-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-button {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
    }

    .filter-button:hover {
      background: #f8fafc;
    }

    .filter-button.active {
      color: #ffffff;
      background: #2563eb;
      border-color: #2563eb;
    }

    .new-recharge-button {
      border: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      color: #ffffff;
      background: #2563eb;
      border-radius: 0.5rem;
      font: inherit;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .new-recharge-button:hover {
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
      vertical-align: top;
    }

    .user-name,
    .package-cell,
    .quantity-cell,
    .amount-cell {
      color: #0f172a;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .user-name,
    .quantity-cell,
    .amount-cell {
      font-weight: 600;
    }

    .package-cell {
      font-weight: 400;
    }

    .user-email,
    .payment-cell,
    .date-cell {
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .payment-cell {
      text-transform: capitalize;
    }

    .user-company {
      color: #94a3b8;
      font-size: 0.75rem;
      line-height: 1rem;
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

    .status-badge.pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-badge.approved {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.rejected {
      background: #fee2e2;
      color: #991b1b;
    }

    .operation-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 0.375rem;
      color: #1d4ed8;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .muted-italic {
      color: #94a3b8;
      font-size: 0.75rem;
      line-height: 1rem;
      font-style: italic;
    }

    .action-group {
      display: flex;
      gap: 0.5rem;
    }

    .approve-button,
    .reject-button {
      border: 0;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .approve-button {
      background: #dcfce7;
      color: #15803d;
    }

    .approve-button:hover {
      background: #bbf7d0;
    }

    .reject-button {
      background: #fee2e2;
      color: #b91c1c;
    }

    .reject-button:hover {
      background: #fecaca;
    }

    .processed-label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .row-icon {
      width: 1rem;
      height: 1rem;
      flex: 0 0 auto;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 0;
    }

    .empty-icon {
      width: 3rem;
      height: 3rem;
      color: #cbd5e1;
      margin: 0 auto 1rem;
    }

    .empty-state p {
      margin: 0;
      color: #475569;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgb(0 0 0 / 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-card {
      width: 100%;
      max-width: 28rem;
      background: #ffffff;
      border-radius: 1rem;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
      padding: 1.5rem;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .modal-header h3 {
      margin: 0;
      color: #0f172a;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 700;
    }

    .modal-close {
      border: 0;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
    }

    .modal-close:hover {
      color: #475569;
    }

    .modal-close span {
      font-size: 1.5rem;
      line-height: 2rem;
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
      margin-bottom: 0.5rem;
    }

    .modal-form select,
    .modal-form input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      color: #0f172a;
      font: inherit;
      outline: none;
      background: #ffffff;
    }

    .modal-form select:focus,
    .modal-form input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .modal-form .approval-input:focus {
      box-shadow: 0 0 0 2px #22c55e;
    }

    .field-help {
      margin: 0.25rem 0 0;
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .modal-error {
      margin: 0;
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .note-box {
      border-radius: 0.5rem;
      padding: 0.75rem;
      border: 1px solid;
    }

    .note-box p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .blue-note {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1e40af;
    }

    .amber-note {
      background: #fffbeb;
      border-color: #fde68a;
      color: #92400e;
    }

    .approval-info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .approval-info h4 {
      margin: 0 0 0.75rem;
      color: #1e3a8a;
      font-weight: 600;
    }

    .info-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .info-row span {
      color: #1d4ed8;
    }

    .info-row strong {
      color: #1e3a8a;
      font-weight: 500;
      text-align: right;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      padding-top: 1rem;
    }

    .cancel-button,
    .create-button,
    .approve-submit-button {
      flex: 1;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 150ms ease, opacity 150ms ease;
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

    .create-button,
    .approve-submit-button {
      border: 0;
      color: #ffffff;
    }

    .create-button {
      background: #2563eb;
    }

    .create-button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .approve-submit-button {
      background: #16a34a;
    }

    .approve-submit-button:hover:not(:disabled) {
      background: #15803d;
    }

    .create-button:disabled,
    .approve-submit-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 767px) {
      .inventory-content,
      .toolbar,
      .modal-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .filter-group {
        align-items: flex-start;
      }

      .new-recharge-button {
        justify-content: center;
      }
    }
  `]
})
export class RechargesPageComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  recharges: RechargeWithDetails[] = [];
  users: RechargeUser[] = [];
  packages: SmsPackage[] = [];
  loading = true;
  submitting = false;
  filter: RechargeFilter = 'pending';
  inventoryAvailable = 0;
  showCreateModal = false;
  showApprovalModal = false;
  selectedRecharge: RechargeWithDetails | null = null;
  operationCode = '';
  approvalError = '';
  message = '';
  newRecharge = {
    user_id: '',
    package_id: '',
    payment_method: 'yape'
  };
  readonly filterOptions: Array<{ value: RechargeFilter; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobadas' },
    { value: 'rejected', label: 'Rechazadas' }
  ];

  get filteredRecharges(): RechargeWithDetails[] {
    if (this.filter === 'all') {
      return this.recharges;
    }

    return this.recharges.filter((recharge) => recharge.status === this.filter);
  }

  get inventoryTone(): 'danger' | 'warning' | 'safe' {
    if (this.inventoryAvailable < 1000) {
      return 'danger';
    }

    if (this.inventoryAvailable < 10000) {
      return 'warning';
    }

    return 'safe';
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadRecharges(),
      this.loadInventory(),
      this.loadUsers(),
      this.loadPackages()
    ]);
    this.loading = false;
  }

  async loadUsers(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('users')
        .select('id, email, full_name, company')
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        throw error;
      }

      this.users = (data ?? []).map((user: any) => ({
        id: String(user.id ?? ''),
        email: String(user.email ?? ''),
        full_name: String(user.full_name ?? ''),
        company: typeof user.company === 'string' ? user.company : null
      }));
    } catch (error) {
      console.warn('Error loading recharge users:', error);
      this.users = [];
    }
  }

  async loadPackages(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('sms_packages')
        .select('id, name, quantity, total_price')
        .eq('is_active', true)
        .order('quantity');

      if (error) {
        throw error;
      }

      this.packages = (data ?? []).map((packageOption: any) => ({
        id: String(packageOption.id ?? ''),
        name: String(packageOption.name ?? ''),
        quantity: Number(packageOption.quantity ?? 0),
        total_price: Number(packageOption.total_price ?? 0)
      }));
    } catch (error) {
      console.warn('Error loading sms packages:', error);
      this.packages = [];
    }
  }

  async loadInventory(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('sms_inventory')
        .select('available_sms')
        .single();

      if (error) {
        throw error;
      }

      this.inventoryAvailable = Number(data?.available_sms ?? 0);
    } catch (error) {
      console.warn('Error loading sms inventory:', error);
      this.inventoryAvailable = 0;
    }
  }

  async loadRecharges(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('recharges')
        .select(`
          *,
          user:users(full_name, email, company),
          package:sms_packages(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.recharges = (data ?? []).map((recharge: any) => ({
        id: String(recharge.id ?? ''),
        user_id: String(recharge.user_id ?? ''),
        package_id: String(recharge.package_id ?? ''),
        quantity: Number(recharge.quantity ?? 0),
        amount: Number(recharge.amount ?? 0),
        payment_method: String(recharge.payment_method ?? ''),
        status: this.toStatus(recharge.status),
        created_at: String(recharge.created_at ?? new Date().toISOString()),
        operation_code: typeof recharge.operation_code === 'string' ? recharge.operation_code : null,
        user: {
          full_name: String(recharge.user?.full_name ?? ''),
          email: String(recharge.user?.email ?? ''),
          company: typeof recharge.user?.company === 'string' ? recharge.user.company : null
        },
        package: {
          name: String(recharge.package?.name ?? '')
        }
      }));
    } catch (error) {
      console.warn('Error loading recharges:', error);
      this.recharges = [];
    }
  }

  openCreateModal(): void {
    this.message = '';
    this.newRecharge = {
      user_id: '',
      package_id: '',
      payment_method: 'yape'
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  handleCreateRecharge(): void {
    this.submitting = true;
    this.message = 'La creación segura de recargas se conectará en la siguiente fase.';
    this.submitting = false;
    this.showCreateModal = false;
  }

  openApprovalModal(recharge: RechargeWithDetails): void {
    this.message = '';
    this.approvalError = '';
    this.selectedRecharge = recharge;
    this.operationCode = '';
    this.showApprovalModal = true;
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedRecharge = null;
    this.operationCode = '';
    this.approvalError = '';
  }

  handleApprove(): void {
    if (!this.operationCode.trim()) {
      this.approvalError = 'El código de operación bancaria es requerido';
      return;
    }

    this.approvalError = '';
    this.submitting = true;
    this.message = 'La aprobación segura de recargas se conectará en la siguiente fase.';
    this.submitting = false;
    this.closeApprovalModal();
  }

  handleReject(): void {
    this.message = 'El rechazo seguro de recargas se conectará en la siguiente fase.';
  }

  statusLabel(status: RechargeStatus): string {
    const labels: Record<RechargeStatus, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    };

    return labels[status];
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  private toStatus(value: unknown): RechargeStatus {
    return value === 'approved' || value === 'rejected' || value === 'pending'
      ? value
      : 'pending';
  }
}

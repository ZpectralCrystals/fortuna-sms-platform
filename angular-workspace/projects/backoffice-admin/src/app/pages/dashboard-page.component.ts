import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from '../../../../shared/src/lib/services/supabase.service';

const WHOLESALE_SMS_COST = 0.04012;

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingRecharges: number;
  totalSmsBalance: number;
  inventoryAvailable: number;
  inventorySold: number;
  inventoryTotal: number;
  totalMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  totalRevenue: number;
}

interface InventoryPurchase {
  id: string;
  quantity: number;
  amount: number;
  cost_per_sms: number;
  operation_number: string | null;
  notes: string | null;
  created_at: string;
  purchased_by: string | null;
  admin: {
    full_name: string;
    email: string;
  } | null;
}

interface StatCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: 'package' | 'trendingUp' | 'creditCard' | 'users';
  textColor: string;
  bgColor: string;
}

@Component({
  selector: 'bo-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!loading" class="dashboard">
      <div class="page-header">
        <h2>Panel de Control</h2>
        <div class="header-actions">
          <button
            type="button"
            class="action-button history-button"
            (click)="showPurchaseHistory = !showPurchaseHistory"
          >
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l4 2" />
            </svg>
            <span>Historial de Compras</span>
          </button>

          <button
            type="button"
            class="action-button purchase-button"
            (click)="openPurchaseModal()"
          >
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            <span>Comprar SMS</span>
          </button>
        </div>
      </div>

      <p *ngIf="successMessage" class="message-box success-box">
        {{ successMessage }}
      </p>

      <p *ngIf="errorMessage" class="message-box error-box">
        {{ errorMessage }}
      </p>

      <div class="stats-grid">
        <div
          *ngFor="let stat of statCards"
          class="stat-card"
        >
          <div class="stat-icon-row">
            <div class="stat-icon-box" [ngClass]="stat.bgColor">
              <ng-container [ngSwitch]="stat.icon">
                <svg *ngSwitchCase="'package'" class="stat-icon" [ngClass]="stat.textColor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m7.5 4.27 9 5.15" />
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>

                <svg *ngSwitchCase="'trendingUp'" class="stat-icon" [ngClass]="stat.textColor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>

                <svg *ngSwitchCase="'creditCard'" class="stat-icon" [ngClass]="stat.textColor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>

                <svg *ngSwitchCase="'users'" class="stat-icon" [ngClass]="stat.textColor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </ng-container>
            </div>
          </div>

          <div>
            <p class="stat-title">{{ stat.title }}</p>
            <p class="stat-value" [ngClass]="stat.textColor">{{ stat.value }}</p>
            <p class="stat-subtitle">{{ stat.subtitle }}</p>
          </div>
        </div>
      </div>

      <div class="summary-grid">
        <section class="summary-card">
          <h3>Resumen del Sistema</h3>
          <div class="summary-list">
            <div class="summary-row bordered">
              <span>Porcentaje de inventario vendido</span>
              <strong>{{ inventorySoldPercentage }}</strong>
            </div>
            <div class="summary-row bordered">
              <span>Tasa de usuarios activos</span>
              <strong>{{ activeUsersRate }}</strong>
            </div>
            <div class="summary-row bordered">
              <span>Promedio SMS por usuario</span>
              <strong>{{ averageSmsPerUser }}</strong>
            </div>
            <div class="summary-row">
              <span>Recargas por procesar</span>
              <strong [class.warning-text]="stats.pendingRecharges > 0" [class.green-text]="stats.pendingRecharges === 0">
                {{ stats.pendingRecharges > 0 ? stats.pendingRecharges + ' pendientes' : 'Todo procesado' }}
              </strong>
            </div>
          </div>
        </section>

        <section class="summary-card">
          <h3>Estadísticas de Mensajería</h3>
          <div class="summary-list">
            <div class="summary-row bordered">
              <span>Total de mensajes enviados</span>
              <strong>{{ formatNumber(stats.totalMessages) }}</strong>
            </div>
            <div class="summary-row bordered">
              <span>Tasa de entrega exitosa</span>
              <strong>{{ deliveryRate }}</strong>
            </div>
            <div class="summary-row bordered">
              <span>Mensajes entregados</span>
              <strong class="green-text">{{ formatNumber(stats.deliveredMessages) }}</strong>
            </div>
            <div class="summary-row">
              <span>Mensajes pendientes</span>
              <strong class="warning-text">{{ formatNumber(stats.totalMessages - stats.sentMessages) }}</strong>
            </div>
          </div>
        </section>
      </div>

      <section *ngIf="showPurchaseHistory" class="history-card">
        <div class="history-header">
          <h3>
            <svg class="history-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l4 2" />
            </svg>
            <span>Historial de Compras de SMS</span>
          </h3>
          <p>Registro completo de todas las compras de inventario realizadas</p>
        </div>

        <div *ngIf="purchases.length === 0" class="empty-history">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          <p class="empty-title">No hay compras registradas</p>
          <p class="empty-subtitle">Las compras de SMS aparecerán aquí una vez que se realicen</p>
        </div>

        <div *ngIf="purchases.length > 0" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cantidad SMS</th>
                <th>Monto Pagado</th>
                <th>Costo/SMS</th>
                <th>N° Operación</th>
                <th>Comprado por</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let purchase of purchases">
                <td class="nowrap">
                  <div class="date-cell">{{ formatDate(purchase.created_at) }}</div>
                </td>
                <td class="nowrap">
                  <div class="quantity-cell">
                    <svg class="tiny-package-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m7.5 4.27 9 5.15" />
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5" />
                      <path d="M12 22V12" />
                    </svg>
                    <span>{{ formatNumber(purchase.quantity) }}</span>
                  </div>
                </td>
                <td class="nowrap">
                  <span class="amount-cell">S/ {{ formatCurrency(purchase.amount) }}</span>
                </td>
                <td class="nowrap">
                  <span class="cost-cell">S/ {{ formatCurrency(purchase.cost_per_sms) }}</span>
                </td>
                <td>
                  <span *ngIf="purchase.operation_number; else noOperation" class="operation-badge">
                    {{ purchase.operation_number }}
                  </span>
                  <ng-template #noOperation>
                    <span class="muted-italic">Sin registro</span>
                  </ng-template>
                </td>
                <td>
                  <div *ngIf="purchase.admin; else systemPurchase">
                    <div class="admin-purchase-name">{{ purchase.admin.full_name }}</div>
                    <div class="admin-purchase-email">{{ purchase.admin.email }}</div>
                  </div>
                  <ng-template #systemPurchase>
                    <span class="muted-italic">Sistema</span>
                  </ng-template>
                </td>
                <td>
                  <div *ngIf="purchase.notes; else noNotes" class="notes-cell">
                    {{ purchase.notes }}
                  </div>
                  <ng-template #noNotes>
                    <span class="muted-italic">Sin notas</span>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="purchases.length > 0" class="history-footer">
          <div class="history-totals">
            <div>
              Total de compras registradas: <span>{{ purchases.length }}</span>
            </div>
            <div>
              Total SMS comprados:
              <span class="blue-text">{{ formatNumber(totalPurchasedSms) }}</span>
            </div>
            <div>
              Total invertido:
              <span class="green-text">S/ {{ formatCurrency(totalPurchasedAmount) }}</span>
            </div>
          </div>
        </div>
      </section>

      <div *ngIf="showPurchaseModal" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Comprar SMS</h3>
            <button
              type="button"
              class="modal-close"
              (click)="closePurchaseModal()"
              aria-label="Cerrar"
            >
              <span>&times;</span>
            </button>
          </div>

          <form class="purchase-form" (ngSubmit)="handlePurchase()">
            <div>
              <label>Monto pagado (S/)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                name="amount"
                [(ngModel)]="purchaseForm.amount"
                (ngModelChange)="onAmountChange($event)"
                placeholder="500.00"
              />
              <p>Precio por SMS al por mayor: S/ 0.04012 (Incluye IGV)</p>
            </div>

            <div>
              <label>Cantidad de SMS</label>
              <input
                type="number"
                required
                min="1"
                name="quantity"
                [(ngModel)]="purchaseForm.quantity"
                readonly
                class="readonly-input"
                placeholder="Se calcula automáticamente"
              />
              <p>Calculado automáticamente según el monto pagado</p>
            </div>

            <div>
              <label>Número de Operación Bancaria</label>
              <input
                type="text"
                name="operationNumber"
                [(ngModel)]="purchaseForm.operationNumber"
                placeholder="Ej: OP-123456789"
              />
              <p>Número de referencia de la transacción bancaria</p>
            </div>

            <div>
              <label>Notas (opcional)</label>
              <textarea
                name="notes"
                [(ngModel)]="purchaseForm.notes"
                rows="3"
                placeholder="Proveedor, número de orden, etc."
              ></textarea>
            </div>

            <div *ngIf="purchaseForm.quantity && purchaseForm.amount" class="purchase-summary">
              <div>
                <p><strong>Cantidad de SMS:</strong> {{ formatNumber(toNumber(purchaseForm.quantity)) }} SMS</p>
                <p><strong>Costo por SMS:</strong> S/ 0.04012 (Incluye IGV)</p>
                <p><strong>Total:</strong> S/ {{ formatCurrency(toNumber(purchaseForm.amount)) }}</p>
              </div>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="cancel-button"
                (click)="closePurchaseModal()"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="submit-button"
                [disabled]="submitting"
              >
                {{ submitting ? 'Procesando...' : 'Agregar al Inventario' }}
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
      border: 0 solid transparent;
      border-bottom: 2px solid #2563eb;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      color: #0f172a;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .page-header h2 {
      margin: 0;
      color: #0f172a;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 700;
      letter-spacing: 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .action-button {
      border: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      color: #ffffff;
      cursor: pointer;
      transition: background-color 150ms ease, opacity 150ms ease;
      font: inherit;
    }

    .history-button {
      background: #475569;
    }

    .history-button:hover {
      background: #334155;
    }

    .purchase-button,
    .submit-button {
      background: #2563eb;
    }

    .purchase-button:hover,
    .submit-button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .button-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 auto;
    }

    .message-box {
      margin: 0;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .success-box {
      color: #166534;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .error-box {
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .stat-card,
    .summary-card {
      background: #ffffff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      border: 1px solid #e2e8f0;
      padding: 1.5rem;
    }

    .stat-card {
      transition: box-shadow 150ms ease;
    }

    .stat-card:hover {
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }

    .stat-icon-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .stat-icon-box {
      width: 3rem;
      height: 3rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon {
      width: 1.5rem;
      height: 1.5rem;
    }

    .bg-blue-50 {
      background: #eff6ff;
    }

    .bg-green-50 {
      background: #f0fdf4;
    }

    .bg-amber-50 {
      background: #fffbeb;
    }

    .bg-slate-50 {
      background: #f8fafc;
    }

    .text-blue-600,
    .blue-text {
      color: #2563eb;
    }

    .text-green-600,
    .green-text {
      color: #16a34a;
    }

    .text-amber-600,
    .warning-text {
      color: #d97706;
    }

    .text-slate-600 {
      color: #475569;
    }

    .stat-title {
      margin: 0 0 0.25rem;
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
    }

    .stat-value {
      margin: 0 0 0.25rem;
      font-size: 1.875rem;
      line-height: 2.25rem;
      font-weight: 700;
    }

    .stat-subtitle {
      margin: 0;
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .summary-card h3 {
      margin: 0 0 1rem;
      color: #0f172a;
      font-size: 1.25rem;
      line-height: 1.75rem;
      font-weight: 700;
    }

    .summary-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .summary-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 0;
    }

    .summary-row.bordered {
      border-bottom: 1px solid #f1f5f9;
    }

    .summary-row span {
      color: #475569;
    }

    .summary-row strong {
      color: #0f172a;
      font-weight: 600;
      white-space: nowrap;
    }

    .summary-row strong.warning-text,
    .summary-row strong.green-text {
      color: inherit;
    }

    .history-card {
      background: #ffffff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .history-header {
      background: linear-gradient(90deg, #334155 0%, #475569 100%);
      padding: 1rem 1.5rem;
    }

    .history-header h3 {
      margin: 0;
      color: #ffffff;
      font-size: 1.25rem;
      line-height: 1.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .history-title-icon {
      width: 1.5rem;
      height: 1.5rem;
      flex: 0 0 auto;
    }

    .history-header p {
      margin: 0.25rem 0 0;
      color: #e2e8f0;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .empty-history {
      text-align: center;
      padding: 3rem 1.5rem;
    }

    .empty-icon {
      width: 4rem;
      height: 4rem;
      color: #cbd5e1;
      margin: 0 auto 1rem;
    }

    .empty-title {
      margin: 0;
      color: #475569;
      font-size: 1.125rem;
      line-height: 1.75rem;
      font-weight: 500;
    }

    .empty-subtitle {
      margin: 0.5rem 0 0;
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.25rem;
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

    .nowrap {
      white-space: nowrap;
    }

    .date-cell {
      color: #0f172a;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
    }

    .quantity-cell {
      display: flex;
      align-items: center;
    }

    .tiny-package-icon {
      width: 1rem;
      height: 1rem;
      color: #3b82f6;
      margin-right: 0.5rem;
      flex: 0 0 auto;
    }

    .quantity-cell span,
    .amount-cell {
      color: #0f172a;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 600;
    }

    .amount-cell {
      color: #16a34a;
    }

    .cost-cell,
    .notes-cell {
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
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

    .admin-purchase-name {
      color: #0f172a;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
    }

    .admin-purchase-email {
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .notes-cell {
      max-width: 20rem;
    }

    .history-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 1rem 1.5rem;
    }

    .history-totals {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      color: #475569;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .history-totals span {
      color: #0f172a;
      font-weight: 600;
    }

    .history-totals .blue-text {
      color: #2563eb;
    }

    .history-totals .green-text {
      color: #16a34a;
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

    .purchase-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .purchase-form label {
      display: block;
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .purchase-form input,
    .purchase-form textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      color: #0f172a;
      font: inherit;
      outline: none;
    }

    .purchase-form input:focus,
    .purchase-form textarea:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .purchase-form input::placeholder,
    .purchase-form textarea::placeholder {
      color: #64748b;
      opacity: 1;
    }

    .purchase-form p {
      margin: 0.25rem 0 0;
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .purchase-form .readonly-input {
      background: #f8fafc;
      color: #475569;
      cursor: not-allowed;
    }

    .purchase-summary {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .purchase-summary div {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .purchase-summary p {
      margin: 0;
      color: #1e3a8a;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      padding-top: 1rem;
    }

    .cancel-button,
    .submit-button {
      flex: 1;
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
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

    .submit-button {
      border: 0;
      color: #ffffff;
    }

    .submit-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (min-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 767px) {
      .page-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .header-actions,
      .history-totals,
      .modal-actions {
        width: 100%;
        flex-direction: column;
      }

      .action-button {
        justify-content: center;
      }
    }
  `]
})
export class DashboardPageComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  stats: DashboardStats = {
    totalUsers: 0,
    activeUsers: 0,
    pendingRecharges: 0,
    totalSmsBalance: 0,
    inventoryAvailable: 0,
    inventorySold: 0,
    inventoryTotal: 0,
    totalMessages: 0,
    sentMessages: 0,
    deliveredMessages: 0,
    totalRevenue: 0
  };

  loading = true;
  submitting = false;
  showPurchaseModal = false;
  showPurchaseHistory = false;
  purchases: InventoryPurchase[] = [];
  adminId: string | null = null;
  errorMessage = '';
  successMessage = '';
  purchaseForm = {
    quantity: '',
    amount: '',
    operationNumber: '',
    notes: ''
  };

  get statCards(): StatCard[] {
    return [
      {
        title: 'Inventario Disponible',
        value: this.formatNumber(this.stats.inventoryAvailable),
        subtitle: `Total: ${this.formatNumber(this.stats.inventoryTotal)} SMS`,
        icon: 'package',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Ingresos',
        value: `S/ ${this.formatCurrency(this.stats.totalRevenue)}`,
        subtitle: `${this.formatNumber(this.stats.inventorySold)} SMS vendidos`,
        icon: 'trendingUp',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Recargas Pendientes',
        value: this.stats.pendingRecharges,
        subtitle: `${this.stats.activeUsers} usuarios activos`,
        icon: 'creditCard',
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-50'
      },
      {
        title: 'Total Usuarios',
        value: this.stats.totalUsers,
        subtitle: `${this.stats.activeUsers} activos`,
        icon: 'users',
        textColor: 'text-slate-600',
        bgColor: 'bg-slate-50'
      }
    ];
  }

  get inventorySoldPercentage(): string {
    return this.stats.inventoryTotal > 0
      ? `${((this.stats.inventorySold / this.stats.inventoryTotal) * 100).toFixed(1)}%`
      : '0%';
  }

  get activeUsersRate(): string {
    return this.stats.totalUsers > 0
      ? `${((this.stats.activeUsers / this.stats.totalUsers) * 100).toFixed(1)}%`
      : '0%';
  }

  get averageSmsPerUser(): string {
    return this.stats.activeUsers > 0
      ? this.formatNumber(Math.round(this.stats.totalSmsBalance / this.stats.activeUsers))
      : '0';
  }

  get deliveryRate(): string {
    return this.stats.sentMessages > 0
      ? `${((this.stats.deliveredMessages / this.stats.sentMessages) * 100).toFixed(1)}%`
      : '0%';
  }

  get totalPurchasedSms(): number {
    return this.purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
  }

  get totalPurchasedAmount(): number {
    return this.purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  }

  async ngOnInit(): Promise<void> {
    await this.loadAdmin();
    await Promise.all([this.loadStats(), this.loadPurchases()]);
    this.loading = false;
  }

  async loadStats(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance.rpc('get_dashboard_stats');

      if (error) {
        throw error;
      }

      if (!data) {
        return;
      }

      const statsData = data as any;

      this.stats = {
        totalUsers: Number(statsData.users?.total_users ?? 0),
        activeUsers: Number(statsData.users?.active_users ?? 0),
        pendingRecharges: Number(statsData.recharges?.pending_recharges ?? 0),
        totalSmsBalance: Number(statsData.users?.total_sms_balance ?? 0),
        inventoryAvailable: Number(statsData.inventory?.available_sms ?? 0),
        inventorySold: Number(statsData.inventory?.sold_sms ?? 0),
        inventoryTotal: Number(statsData.inventory?.total_sms ?? 0),
        totalMessages: Number(statsData.messages?.total_messages ?? 0),
        sentMessages: Number(statsData.messages?.sent_messages ?? 0),
        deliveredMessages: Number(statsData.messages?.delivered_messages ?? 0),
        totalRevenue: Number.parseFloat(String(statsData.users?.total_revenue ?? 0))
      };
    } catch (error) {
      console.error('Error loading stats:', error);
      this.errorMessage = 'No se pudieron cargar las métricas del dashboard.';
    }
  }

  async loadPurchases(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('inventory_purchases')
        .select(`
          *,
          admin:admins(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.purchases = (data ?? []) as unknown as InventoryPurchase[];
    } catch (error) {
      console.warn('Error loading purchases:', error);
      this.purchases = [];
    }
  }

  openPurchaseModal(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.showPurchaseModal = true;
  }

  closePurchaseModal(): void {
    this.showPurchaseModal = false;
  }

  onAmountChange(amount: string): void {
    const numericAmount = Number.parseFloat(amount);
    this.purchaseForm.quantity = Number.isFinite(numericAmount) && numericAmount > 0
      ? Math.floor(numericAmount / WHOLESALE_SMS_COST).toString()
      : '';
  }

  async handlePurchase(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.adminId) {
      this.errorMessage = 'No se pudo identificar al administrador actual.';
      return;
    }

    const quantity = Number.parseInt(this.purchaseForm.quantity, 10);
    const amount = Number.parseFloat(this.purchaseForm.amount);

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(quantity) || quantity < 1) {
      this.errorMessage = 'Ingresa un monto válido para calcular la cantidad de SMS.';
      return;
    }

    try {
      this.submitting = true;

      const { error } = await this.supabaseService.instance.rpc('add_sms_to_inventory', {
        p_quantity: quantity,
        p_amount: amount,
        p_admin_id: this.adminId,
        p_notes: this.purchaseForm.notes || null,
        p_operation_number: this.purchaseForm.operationNumber || null
      });

      if (error) {
        throw error;
      }

      this.successMessage = 'Compra de SMS agregada al inventario exitosamente';
      this.showPurchaseModal = false;
      this.purchaseForm = { quantity: '', amount: '', operationNumber: '', notes: '' };
      await Promise.all([this.loadStats(), this.loadPurchases()]);
    } catch (error) {
      console.error('Error adding SMS to inventory:', error);
      this.errorMessage = 'Error al agregar SMS al inventario';
    } finally {
      this.submitting = false;
    }
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

  toNumber(value: string): number {
    return Number.parseFloat(value || '0');
  }

  private async loadAdmin(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance.auth.getSession();

      if (error || !data.session?.user) {
        this.adminId = null;
        return;
      }

      this.adminId = data.session.user.id;
    } catch {
      this.adminId = null;
    }
  }
}

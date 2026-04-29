import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { SupabaseService } from '@sms-fortuna/shared';

const IGV_RATE = 0.18;
const WHATSAPP_NUMBER = '51982165728';
const QR_ASSET = 'assets/whatsapp_image_2026-02-01_at_10.23.01_am.jpeg';

interface RechargePackage {
  amount: number;
  sms: number;
  popular?: boolean;
}

interface PaymentMethod {
  id: 'yape' | 'plin' | 'transferencia';
  name: string;
  icon: string;
}

interface ProfileBalance {
  credits: number;
  total_spent: number;
}

interface RechargeRecord {
  id: string;
  user_id: string;
  amount: number;
  sms_credits: number;
  status: 'completed' | 'failed' | 'pending' | string;
  payment_method: string | null;
  created_at: string;
}

@Component({
  selector: 'sms-recharges-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recharges-page">
      <header class="page-header">
        <div>
          <h1>Recargas</h1>
          <p>Administra tu saldo y recargas de SMS</p>
        </div>
      </header>

      <p *ngIf="noticeMessage" class="notice-message">
        {{ noticeMessage }}
      </p>

      <section class="balance-card">
        <div class="balance-card__content">
          <div>
            <p class="balance-label">Créditos disponibles</p>
            <p class="balance-value">{{ formatCredits(profile.credits) }}</p>
            <p class="balance-subtitle">SMS disponibles para enviar</p>
          </div>
          <div class="balance-spent">
            <p class="balance-label">Total gastado</p>
            <p class="spent-value">S/ {{ formatCurrency(profile.total_spent) }}</p>
          </div>
        </div>
      </section>

      <section class="rate-box">
        <div class="rate-layout">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
          <div>
            <h2>Tarifas por Operador (Precio Base)</h2>
            <div class="rate-lines">
              <p><strong>Movistar, Claro y Entel:</strong> S/ 0.08 + IGV por SMS</p>
              <p><strong>Bitel:</strong> USD$ 0.0678 + IGV por SMS</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 class="section-title">Paquetes de recarga</h2>
        <div class="packages-grid">
          <article
            *ngFor="let pkg of rechargePackages"
            class="package-card"
            [ngClass]="{ 'package-card--popular': pkg.popular }"
            (click)="selectPackage(pkg)"
          >
            <div *ngIf="pkg.popular" class="popular-badge">
              Popular
            </div>

            <div class="package-content">
              <p class="package-amount">S/ {{ formatNumber(pkg.amount) }}</p>
              <p class="package-caption">Total a pagar (inc. IGV)</p>

              <div class="package-sms">
                <p>{{ formatNumber(pkg.sms) }} SMS</p>
                <span>Recarga efectiva: S/ {{ formatCurrency(calculateSubtotal(pkg.amount)) }}</span>
              </div>

              <div class="package-breakdown">
                <div>
                  <span>Base imponible:</span>
                  <span>S/ {{ formatCurrency(calculateSubtotal(pkg.amount)) }}</span>
                </div>
                <div>
                  <span>IGV (18%):</span>
                  <span>S/ {{ formatCurrency(calculateIGV(pkg.amount)) }}</span>
                </div>
                <div class="package-total">
                  <span>Total a pagar:</span>
                  <strong>S/ {{ formatCurrency(pkg.amount) }}</strong>
                </div>
              </div>

              <button type="button" class="recharge-button">
                Recargar
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="history-card">
        <div class="history-card__header">
          <h2>Historial de recargas</h2>
        </div>

        <div class="history-list">
          <div *ngIf="recharges.length === 0" class="empty-history">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <path d="M2 10h20"></path>
            </svg>
            <p>No hay recargas aún</p>
          </div>

          <article *ngFor="let recharge of recharges" class="history-row">
            <div class="history-row__left">
              <div class="status-icon" [ngClass]="statusIconClass(recharge.status)">
                <svg *ngIf="recharge.status === 'completed'" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 12l2 2 4-4"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                <svg *ngIf="recharge.status === 'failed'" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="m15 9-6 6"></path>
                  <path d="m9 9 6 6"></path>
                </svg>
                <svg *ngIf="recharge.status !== 'completed' && recharge.status !== 'failed'" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>

              <div>
                <p class="history-sms">{{ formatNumber(recharge.sms_credits) }} SMS</p>
                <p class="history-meta">
                  {{ recharge.payment_method || 'Sin método' }} -
                  {{ formatHistoryDate(recharge.created_at) }}
                </p>
              </div>
            </div>

            <div class="history-row__right">
              <p>S/ {{ formatCurrency(recharge.amount) }}</p>
              <span [ngClass]="statusTextClass(recharge.status)">
                {{ statusLabel(recharge.status) }}
              </span>
            </div>
          </article>
        </div>
      </section>

      <div *ngIf="showModal" class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="modal-card">
          <h2>Confirmar recarga</h2>

          <div class="selected-package-card">
            <p class="selected-label">Paquete seleccionado</p>
            <div class="selected-summary">
              <p class="selected-amount">S/ {{ formatNumber(selectedPackage?.amount || 0) }}</p>
              <p class="selected-sms">{{ formatNumber(selectedPackage?.sms || 0) }} SMS</p>
              <p class="selected-effective">
                Recarga efectiva: S/ {{ formatCurrency(calculateSubtotal(selectedPackage?.amount || 0)) }}
              </p>
            </div>

            <div class="selected-breakdown">
              <div>
                <span>Base imponible:</span>
                <strong>S/ {{ formatCurrency(calculateSubtotal(selectedPackage?.amount || 0)) }}</strong>
              </div>
              <div>
                <span>IGV (18%):</span>
                <strong>S/ {{ formatCurrency(calculateIGV(selectedPackage?.amount || 0)) }}</strong>
              </div>
              <div class="selected-total">
                <span>Total a pagar:</span>
                <strong>S/ {{ formatCurrency(calculateTotal(selectedPackage?.amount || 0)) }}</strong>
              </div>
            </div>
          </div>

          <div class="payment-section">
            <label>Selecciona tu método de pago</label>
            <div class="payment-grid">
              <button
                *ngFor="let method of paymentMethods"
                type="button"
                class="payment-method"
                [ngClass]="{ 'payment-method--selected': selectedMethod === method.id }"
                (click)="selectedMethod = method.id; requestMessage = ''"
              >
                <span>{{ method.icon }}</span>
                <strong>{{ method.name }}</strong>
              </button>
            </div>
          </div>

          <section *ngIf="selectedMethod" class="payment-detail">
            <div *ngIf="selectedMethod === 'yape' || selectedMethod === 'plin'" class="qr-section">
              <h3>Escanea este código QR con {{ selectedMethod === 'yape' ? 'Yape' : 'Plin' }}</h3>

              <div class="qr-wrap">
                <img
                  [src]="qrAsset"
                  alt="QR Code Yape/Plin"
                />
              </div>

              <div class="beneficiary-box">
                <p>Beneficiario:</p>
                <strong>Fortuna Fintech SAC</strong>
              </div>

              <div class="steps">
                <p>1. Abre tu app de {{ selectedMethod === 'yape' ? 'Yape' : 'Plin' }}</p>
                <p>2. Escanea el código QR</p>
                <p>
                  3. Verifica el monto:
                  <strong>S/ {{ formatCurrency(calculateTotal(selectedPackage?.amount || 0)) }}</strong>
                </p>
                <p>4. Completa la transacción</p>
              </div>

              <div class="whatsapp-box">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <div>
                  <p class="whatsapp-title">Importante: Envía tu constancia de pago</p>
                  <p>
                    Para confirmar tu recarga, envía el comprobante de pago al WhatsApp
                    <strong>+51 982 165 728</strong>
                  </p>
                  <button type="button" class="whatsapp-button" (click)="openWhatsApp()">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <span>Enviar constancia por WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="selectedMethod === 'transferencia'" class="transfer-section">
              <div class="bank-title">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m3 21 18 0"></path>
                  <path d="M5 21V10"></path>
                  <path d="M19 21V10"></path>
                  <path d="M9 21V10"></path>
                  <path d="M15 21V10"></path>
                  <path d="M12 3 2 8h20Z"></path>
                </svg>
                <h3>Banco Interbank</h3>
              </div>

              <div class="bank-details">
                <div class="copy-card">
                  <div>
                    <p>Cuenta Corriente</p>
                    <strong>600 300 3562104</strong>
                  </div>
                  <button type="button" title="Copiar número de cuenta" (click)="copyToClipboard('6003003562104', 'cuenta')">
                    <svg viewBox="0 0 24 24" aria-hidden="true" [ngClass]="copiedText === 'cuenta' ? 'copied' : ''">
                      <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>

                <div class="copy-card">
                  <div>
                    <p>Cuenta Interbancaria (CCI)</p>
                    <strong>003 600 003003562104 41</strong>
                  </div>
                  <button type="button" title="Copiar CCI" (click)="copyToClipboard('00360000300356210441', 'cci')">
                    <svg viewBox="0 0 24 24" aria-hidden="true" [ngClass]="copiedText === 'cci' ? 'copied' : ''">
                      <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>

                <div class="bank-card">
                  <p>Titular</p>
                  <strong>Fortuna Fintech SAC</strong>
                </div>

                <div class="bank-card">
                  <p>Monto a transferir</p>
                  <strong class="transfer-amount">S/ {{ formatCurrency(calculateTotal(selectedPackage?.amount || 0)) }}</strong>
                  <span>Incluye IGV</span>
                </div>
              </div>

              <div class="instructions-box">
                <p>Instrucciones:</p>
                <ul>
                  <li>1. Realiza la transferencia por el monto exacto</li>
                  <li>2. Guarda el comprobante de la operación</li>
                  <li>3. Envía el comprobante por WhatsApp</li>
                </ul>
              </div>

              <div class="whatsapp-box">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <div>
                  <p class="whatsapp-title">Importante: Envía tu constancia de pago</p>
                  <p>
                    Para confirmar tu recarga, envía el comprobante de pago al WhatsApp
                    <strong>+51 982 165 728</strong>
                  </p>
                  <button type="button" class="whatsapp-button" (click)="openWhatsApp()">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <span>Enviar constancia por WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <p *ngIf="requestMessage" class="request-message">
            {{ requestMessage }}
          </p>

          <div class="modal-actions">
            <button type="button" class="cancel-button" (click)="closeModal()">
              Cancelar
            </button>
            <button
              type="button"
              class="confirm-button"
              [disabled]="!selectedMethod"
              (click)="showPendingRechargeMessage()"
            >
              Confirmar recarga
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
    ul {
      margin: 0;
    }

    ul {
      list-style: none;
      padding: 0;
    }

    .recharges-page {
      display: grid;
      gap: 24px;
    }

    .page-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    h1 {
      color: #111827;
      font-size: 30px;
      font-weight: 700;
      line-height: 36px;
    }

    .page-header p {
      color: #4b5563;
      line-height: 24px;
      margin-top: 4px;
    }

    .notice-message,
    .request-message {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      color: #1e40af;
      font-size: 14px;
      line-height: 20px;
      padding: 12px 16px;
    }

    .balance-card {
      background: linear-gradient(90deg, #2563eb 0%, #06b6d4 100%);
      border-radius: 12px;
      box-shadow: 0 10px 15px rgba(15, 23, 42, 0.12);
      color: #ffffff;
      padding: 32px;
    }

    .balance-card__content {
      align-items: center;
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }

    .balance-label {
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      margin-bottom: 8px;
      opacity: 0.9;
    }

    .balance-value {
      font-size: 48px;
      font-weight: 700;
      line-height: 1;
    }

    .balance-subtitle {
      font-size: 14px;
      line-height: 20px;
      margin-top: 8px;
      opacity: 0.9;
    }

    .balance-spent {
      text-align: right;
    }

    .spent-value {
      font-size: 30px;
      font-weight: 700;
      line-height: 36px;
    }

    .rate-box {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
    }

    .rate-layout {
      align-items: flex-start;
      display: flex;
    }

    .rate-layout svg {
      color: #2563eb;
      flex-shrink: 0;
      height: 24px;
      width: 24px;
    }

    .rate-layout > div {
      flex: 1;
      margin-left: 16px;
    }

    .rate-box h2 {
      color: #1e3a8a;
      font-size: 14px;
      font-weight: 700;
      line-height: 20px;
      margin-bottom: 8px;
    }

    .rate-lines {
      color: #1e40af;
      display: grid;
      font-size: 14px;
      gap: 4px;
      line-height: 20px;
    }

    .section-title {
      color: #111827;
      font-size: 20px;
      font-weight: 700;
      line-height: 28px;
      margin-bottom: 16px;
    }

    .packages-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .package-card {
      background: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      cursor: pointer;
      padding: 24px;
      position: relative;
      transition: box-shadow 160ms ease, border-color 160ms ease;
    }

    .package-card:hover {
      box-shadow: 0 10px 15px rgba(15, 23, 42, 0.1);
    }

    .package-card--popular {
      border-color: #3b82f6;
    }

    .popular-badge {
      background: #3b82f6;
      border-radius: 999px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      left: 50%;
      line-height: 16px;
      padding: 4px 12px;
      position: absolute;
      top: -12px;
      transform: translateX(-50%);
    }

    .package-content {
      text-align: center;
    }

    .package-amount {
      color: #2563eb;
      font-size: 36px;
      font-weight: 700;
      line-height: 40px;
    }

    .package-caption {
      color: #4b5563;
      font-size: 14px;
      line-height: 20px;
      margin-top: 4px;
    }

    .package-sms,
    .package-breakdown {
      border-top: 1px solid #e5e7eb;
      margin-top: 12px;
      padding-top: 12px;
    }

    .package-sms p {
      color: #111827;
      font-size: 18px;
      font-weight: 600;
      line-height: 28px;
    }

    .package-sms span,
    .package-breakdown div {
      color: #6b7280;
      font-size: 12px;
      line-height: 16px;
    }

    .package-sms span {
      display: block;
      margin-top: 4px;
    }

    .package-breakdown {
      display: grid;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
    }

    .package-breakdown div {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    .package-total {
      border-top: 1px solid #e5e7eb;
      margin-top: 8px;
      padding-top: 8px;
    }

    .package-total span {
      color: #374151;
      font-size: 14px;
      font-weight: 600;
      line-height: 20px;
    }

    .package-total strong {
      color: #2563eb;
      font-size: 20px;
      line-height: 28px;
    }

    .recharge-button {
      background: #2563eb;
      border: 0;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      font-weight: 500;
      line-height: 24px;
      margin-top: 16px;
      padding: 8px 16px;
      transition: background-color 160ms ease;
      width: 100%;
    }

    .recharge-button:hover {
      background: #1d4ed8;
    }

    .history-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .history-card__header {
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 24px;
    }

    .history-card__header h2 {
      color: #111827;
      font-size: 20px;
      font-weight: 700;
      line-height: 28px;
    }

    .history-list > * + * {
      border-top: 1px solid #e5e7eb;
    }

    .empty-history {
      padding: 48px 24px;
      text-align: center;
    }

    .empty-history svg {
      color: #9ca3af;
      display: block;
      height: 48px;
      margin: 0 auto 12px;
      width: 48px;
    }

    .empty-history p {
      color: #4b5563;
      line-height: 24px;
    }

    .history-row {
      padding: 16px 24px;
      transition: background-color 160ms ease;
    }

    .history-row:hover {
      background: #f9fafb;
    }

    .history-row,
    .history-row__left {
      align-items: center;
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .history-row__left {
      justify-content: flex-start;
    }

    .status-icon {
      align-items: center;
      border-radius: 999px;
      display: flex;
      flex-shrink: 0;
      height: 40px;
      justify-content: center;
      width: 40px;
    }

    .status-icon svg {
      height: 20px;
      width: 20px;
    }

    .status-icon--completed {
      background: #dcfce7;
      color: #16a34a;
    }

    .status-icon--failed {
      background: #fee2e2;
      color: #dc2626;
    }

    .status-icon--pending {
      background: #fef3c7;
      color: #d97706;
    }

    .history-sms {
      color: #111827;
      font-weight: 500;
      line-height: 24px;
    }

    .history-meta {
      color: #4b5563;
      font-size: 14px;
      line-height: 20px;
    }

    .history-row__right {
      text-align: right;
    }

    .history-row__right p {
      color: #111827;
      font-weight: 700;
      line-height: 24px;
    }

    .history-row__right span {
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
    }

    .status-text--completed {
      color: #16a34a;
    }

    .status-text--failed {
      color: #dc2626;
    }

    .status-text--pending {
      color: #d97706;
    }

    .modal-backdrop {
      align-items: center;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      inset: 0;
      justify-content: center;
      overflow-y: auto;
      padding: 16px;
      position: fixed;
      z-index: 50;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25);
      margin: 32px 0;
      max-width: 672px;
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

    .selected-package-card {
      background: linear-gradient(90deg, #2563eb 0%, #06b6d4 100%);
      border-radius: 8px;
      color: #ffffff;
      margin-bottom: 24px;
      padding: 20px;
    }

    .selected-label {
      font-size: 14px;
      line-height: 20px;
      margin-bottom: 12px;
      opacity: 0.9;
    }

    .selected-amount {
      font-size: 36px;
      font-weight: 700;
      line-height: 40px;
    }

    .selected-sms {
      font-size: 18px;
      line-height: 28px;
      margin-top: 8px;
      opacity: 0.9;
    }

    .selected-effective {
      font-size: 14px;
      line-height: 20px;
      margin-top: 4px;
      opacity: 0.75;
    }

    .selected-summary {
      margin-bottom: 16px;
    }

    .selected-breakdown {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      display: grid;
      gap: 8px;
      padding: 16px;
    }

    .selected-breakdown div {
      align-items: center;
      display: flex;
      font-size: 14px;
      justify-content: space-between;
      line-height: 20px;
    }

    .selected-breakdown span {
      opacity: 0.9;
    }

    .selected-total {
      border-top: 1px solid rgba(255, 255, 255, 0.3);
      margin-top: 8px;
      padding-top: 8px;
    }

    .selected-total span {
      font-size: 18px;
      font-weight: 700;
      line-height: 28px;
      opacity: 1;
    }

    .selected-total strong {
      font-size: 24px;
      line-height: 32px;
    }

    .payment-section {
      margin-bottom: 24px;
    }

    .payment-section label {
      color: #374151;
      display: block;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      margin-bottom: 12px;
    }

    .payment-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .payment-method {
      align-items: center;
      background: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      justify-content: center;
      padding: 16px;
      transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
    }

    .payment-method:hover {
      border-color: #d1d5db;
    }

    .payment-method--selected {
      background: #eff6ff;
      border-color: #3b82f6;
      box-shadow: 0 4px 6px rgba(15, 23, 42, 0.08);
    }

    .payment-method span {
      font-size: 30px;
      line-height: 36px;
    }

    .payment-method strong {
      color: #111827;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      text-align: center;
    }

    .payment-detail {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 24px;
      padding: 24px;
    }

    .qr-section {
      text-align: center;
    }

    .qr-section h3,
    .transfer-section h3 {
      color: #111827;
      font-size: 18px;
      font-weight: 700;
      line-height: 28px;
      margin-bottom: 12px;
    }

    .qr-wrap {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      display: inline-block;
      margin-bottom: 16px;
      padding: 16px;
    }

    .qr-wrap img {
      display: block;
      height: 256px;
      object-fit: contain;
      width: 256px;
    }

    .beneficiary-box,
    .bank-card,
    .copy-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }

    .beneficiary-box p,
    .bank-card p,
    .copy-card p {
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      margin-bottom: 8px;
    }

    .beneficiary-box strong,
    .bank-card strong,
    .copy-card strong {
      color: #111827;
      font-weight: 700;
      line-height: 24px;
    }

    .steps {
      color: #4b5563;
      display: grid;
      font-size: 14px;
      gap: 4px;
      line-height: 20px;
      margin-top: 16px;
    }

    .steps strong {
      color: #2563eb;
      font-weight: 700;
    }

    .whatsapp-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      display: flex;
      gap: 12px;
      margin-top: 16px;
      padding: 16px;
      text-align: left;
    }

    .whatsapp-box > svg {
      color: #16a34a;
      flex-shrink: 0;
      height: 20px;
      margin-top: 2px;
      width: 20px;
    }

    .whatsapp-box p {
      color: #166534;
      font-size: 14px;
      line-height: 20px;
    }

    .whatsapp-title {
      color: #14532d;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .whatsapp-button {
      align-items: center;
      background: #16a34a;
      border: 0;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      font: inherit;
      font-weight: 500;
      gap: 8px;
      justify-content: center;
      line-height: 24px;
      margin-top: 12px;
      padding: 10px 16px;
      transition: background-color 160ms ease;
      width: 100%;
    }

    .whatsapp-button:hover {
      background: #15803d;
    }

    .whatsapp-button svg {
      height: 20px;
      width: 20px;
    }

    .bank-title {
      align-items: center;
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }

    .bank-title svg {
      color: #2563eb;
      height: 32px;
      margin-right: 8px;
      width: 32px;
    }

    .bank-details {
      display: grid;
      gap: 16px;
    }

    .copy-card {
      align-items: center;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .copy-card strong {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 18px;
      line-height: 28px;
      word-break: break-word;
    }

    .copy-card button {
      background: transparent;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
      padding: 8px;
      transition: background-color 160ms ease;
    }

    .copy-card button:hover {
      background: #f3f4f6;
    }

    .copy-card svg {
      color: #4b5563;
      height: 20px;
      width: 20px;
    }

    .copy-card svg.copied {
      color: #16a34a;
    }

    .transfer-amount {
      color: #2563eb !important;
      display: block;
      font-size: 24px;
      line-height: 32px;
    }

    .bank-card span {
      color: #6b7280;
      display: block;
      font-size: 12px;
      line-height: 16px;
      margin-top: 4px;
    }

    .instructions-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      margin-top: 16px;
      padding: 16px;
    }

    .instructions-box p {
      color: #1e3a8a;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      margin-bottom: 8px;
    }

    .instructions-box li {
      color: #1e40af;
      font-size: 14px;
      line-height: 20px;
      margin-top: 4px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
    }

    .cancel-button,
    .confirm-button {
      border-radius: 8px;
      cursor: pointer;
      flex: 1;
      font: inherit;
      font-weight: 500;
      line-height: 24px;
      padding: 12px 16px;
      transition: background-color 160ms ease, opacity 160ms ease;
    }

    .cancel-button {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .cancel-button:hover {
      background: #f9fafb;
    }

    .confirm-button {
      background: #2563eb;
      border: 0;
      color: #ffffff;
    }

    .confirm-button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .confirm-button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    @media (min-width: 768px) {
      .packages-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .packages-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .balance-card__content,
      .history-row,
      .modal-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .balance-spent,
      .history-row__right {
        text-align: left;
      }

      .payment-grid {
        grid-template-columns: repeat(1, minmax(0, 1fr));
      }

      .copy-card {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `]
})
export class RechargesPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  readonly rechargePackages: RechargePackage[] = [
    { amount: 50, sms: 530 },
    { amount: 100, sms: 1060, popular: true },
    { amount: 200, sms: 2120 },
    { amount: 500, sms: 5300 },
    { amount: 1000, sms: 10600 }
  ];

  readonly paymentMethods: PaymentMethod[] = [
    { id: 'yape', name: 'Yape', icon: '📱' },
    { id: 'plin', name: 'Plin', icon: '💳' },
    { id: 'transferencia', name: 'Transferencia Bancaria', icon: '🏦' }
  ];

  readonly qrAsset = QR_ASSET;

  profile: ProfileBalance = {
    credits: 0,
    total_spent: 0
  };

  recharges: RechargeRecord[] = [];
  showModal = false;
  selectedPackage: RechargePackage | null = null;
  selectedMethod: PaymentMethod['id'] | '' = '';
  copiedText = '';
  noticeMessage = '';
  requestMessage = '';

  ngOnInit(): void {
    void this.loadData();
  }

  selectPackage(pkg: RechargePackage): void {
    this.selectedPackage = pkg;
    this.selectedMethod = '';
    this.requestMessage = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPackage = null;
    this.selectedMethod = '';
    this.requestMessage = '';
  }

  calculateTotal(amount: number): number {
    return amount;
  }

  calculateSubtotal(amount: number): number {
    return amount / (1 + IGV_RATE);
  }

  calculateIGV(amount: number): number {
    return amount - this.calculateSubtotal(amount);
  }

  showPendingRechargeMessage(): void {
    this.requestMessage =
      'La solicitud automática de recarga se conectará en la siguiente fase. Por ahora envía tu constancia por WhatsApp.';
  }

  openWhatsApp(): void {
    const amount = this.selectedPackage?.amount ?? 0;
    const sms = this.selectedPackage?.sms ?? 0;
    const message = `Hola, he realizado el pago de mi recarga por S/ ${this.formatCurrency(amount)} (${this.formatNumber(sms)} SMS). Adjunto mi constancia de pago.`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  async copyToClipboard(text: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedText = label;
      window.setTimeout(() => {
        this.copiedText = '';
      }, 2000);
    } catch {
      this.noticeMessage = 'No se pudo copiar el dato.';
    }
  }

  statusIconClass(status: string): string {
    if (status === 'completed') return 'status-icon status-icon--completed';
    if (status === 'failed') return 'status-icon status-icon--failed';
    return 'status-icon status-icon--pending';
  }

  statusTextClass(status: string): string {
    if (status === 'completed') return 'status-text--completed';
    if (status === 'failed') return 'status-text--failed';
    return 'status-text--pending';
  }

  statusLabel(status: string): string {
    if (status === 'completed') return 'Completado';
    if (status === 'failed') return 'Fallido';
    return 'Pendiente';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      maximumFractionDigits: 0
    }).format(value);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatCredits(value: number): string {
    return this.formatNumber(value);
  }

  formatHistoryDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private async loadData(): Promise<void> {
    try {
      const { data: sessionData } = await this.supabase.instance.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        this.profile = { credits: 0, total_spent: 0 };
        this.recharges = [];
        return;
      }

      await Promise.all([
        this.loadProfile(userId),
        this.loadRecharges(userId)
      ]);
    } catch {
      this.profile = { credits: 0, total_spent: 0 };
      this.recharges = [];
    }
  }

  private async loadProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.instance
        .from('profiles')
        .select('credits, total_spent')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        this.profile = { credits: 0, total_spent: 0 };
        return;
      }

      const profileData = data as Partial<ProfileBalance>;
      this.profile = {
        credits: Number(profileData.credits ?? 0),
        total_spent: Number(profileData.total_spent ?? 0)
      };
    } catch {
      this.profile = { credits: 0, total_spent: 0 };
    }
  }

  private async loadRecharges(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.instance
        .from('recharges')
        .select('id, user_id, amount, sms_credits, status, payment_method, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.recharges = [];
        return;
      }

      this.recharges = ((data as RechargeRecord[] | null) ?? []).map((recharge) => ({
        ...recharge,
        amount: Number(recharge.amount ?? 0),
        sms_credits: Number(recharge.sms_credits ?? 0),
        payment_method: recharge.payment_method ?? null
      }));
    } catch {
      this.recharges = [];
    }
  }
}

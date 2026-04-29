import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '@sms-fortuna/shared';

type SendMode = 'single' | 'multiple' | 'file';

interface FileMessage {
  phone: string;
  message: string;
}

interface SendProfile {
  id: string;
  credits: number | null;
}

@Component({
  selector: 'sms-send-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="send-page">
      <div>
        <h1>Enviar SMS</h1>
        <p class="page-subtitle">Envía mensajes individuales o campañas masivas</p>
      </div>

      <div *ngIf="success" class="alert alert--success">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 12l2 2 4-4"></path>
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        <div>
          <p>Mensajes enviados exitosamente</p>
          <span>{{ phoneCount }} SMS enviados - S/ {{ totalCost.toFixed(2) }} debitados</span>
        </div>
      </div>

      <div *ngIf="error" class="alert alert--error">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
        <p>{{ error }}</p>
      </div>

      <section class="send-card">
        <div class="tabs">
          <button type="button" [class.tab--active]="mode === 'single'" (click)="setMode('single')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m22 2-7 20-4-9-9-4Z"></path>
              <path d="M22 2 11 13"></path>
            </svg>
            Individual
          </button>
          <button type="button" [class.tab--active]="mode === 'multiple'" (click)="setMode('multiple')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Múltiple
          </button>
          <button type="button" [class.tab--active]="mode === 'file'" (click)="setMode('file')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M16 13H8"></path>
              <path d="M16 17H8"></path>
              <path d="M10 9H8"></path>
            </svg>
            Desde Fichero
          </button>
        </div>

        <form class="send-form" (ngSubmit)="handleSend()">
          <ng-container *ngIf="mode === 'file'">
            <div class="field">
              <label for="campaignName">Nombre de la campaña</label>
              <input
                id="campaignName"
                type="text"
                name="campaignName"
                [(ngModel)]="campaignName"
                placeholder="Ej: Promoción Primavera 2026"
              />
            </div>

            <div class="upload-box">
              <div class="upload-box__header">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <path d="M17 8 12 3 7 8"></path>
                  <path d="M12 3v12"></path>
                </svg>
                <h3>Cargar archivo con mensajes personalizados</h3>
                <p>Sube un archivo Excel (.xlsx, .xls) o CSV con dos columnas: Teléfono y Mensaje</p>

                <div class="upload-actions">
                  <label class="btn btn--blue">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <path d="M17 8 12 3 7 8"></path>
                      <path d="M12 3v12"></path>
                    </svg>
                    Seleccionar archivo
                    <input type="file" accept=".xlsx,.xls,.csv,.txt" (change)="handleExcelUpload($event)" hidden />
                  </label>

                  <button type="button" class="btn btn--green" (click)="downloadTemplate()">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <path d="M7 10l5 5 5-5"></path>
                      <path d="M12 15V3"></path>
                    </svg>
                    Descargar plantilla
                  </button>
                </div>
              </div>

              <div class="format-info">
                <p>Información del formato:</p>
                <ul>
                  <li><strong>Columna 1:</strong> Número de teléfono (Ej: +51987654321 o 987654321)</li>
                  <li><strong>Columna 2:</strong> Mensaje personalizado para cada destinatario</li>
                  <li>Tamaño máximo: 500KB</li>
                  <li>Formatos compatibles: Excel (.xlsx, .xls), CSV (.csv), Texto (.txt)</li>
                  <li>Un mensaje por línea, cada uno puede ser diferente</li>
                </ul>
              </div>
            </div>

            <div *ngIf="fileMessages.length > 0" class="preview-card">
              <div class="preview-card__header">
                <div>
                  <h3>Vista previa de mensajes</h3>
                  <p>{{ fileMessages.length }} mensajes cargados</p>
                </div>
                <button type="button" (click)="clearFileMessages()" title="Limpiar archivo" aria-label="Limpiar archivo">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </button>
              </div>

              <div class="preview-list">
                <div *ngFor="let fm of previewMessages" class="preview-row">
                  <div class="preview-row__phone">{{ fm.phone }}</div>
                  <div class="preview-row__message">
                    <p>{{ fm.message }}</p>
                    <span>{{ smsSegments(fm.message) }} SMS • {{ fm.message.length }} caracteres</span>
                  </div>
                </div>
                <div *ngIf="fileMessages.length > 10" class="preview-more">
                  ... y {{ fileMessages.length - 10 }} mensajes más
                </div>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="mode === 'single'">
            <div class="field">
              <label for="recipient">Número de teléfono</label>
              <input
                id="recipient"
                type="text"
                name="recipient"
                required
                [(ngModel)]="recipient"
                placeholder="+51987654321"
              />
              <small>Formato: +51987654321 o 987654321</small>
            </div>

            <div class="example-card example-card--blue">
              <h4><span>💡</span>Ejemplo de mensaje</h4>
              <div>
                <p>"Hola Juan, te recordamos tu cita para el día de mañana a las 10:00 AM en nuestra sede principal. ¡Te esperamos!"</p>
                <small>130 caracteres • 1 SMS</small>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="mode === 'multiple'">
            <div class="field">
              <div class="field__header">
                <label for="multiplePhones">Números de teléfono (uno por línea)</label>
                <label class="file-inline">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <path d="M17 8 12 3 7 8"></path>
                    <path d="M12 3v12"></path>
                  </svg>
                  Cargar archivo
                  <input type="file" accept=".txt,.csv" (change)="handleFileUpload($event)" hidden />
                </label>
              </div>
              <textarea
                id="multiplePhones"
                name="multiplePhones"
                required
                rows="6"
                [(ngModel)]="multiplePhones"
                placeholder="+51987654321&#10;+51976543210&#10;965432109"
                class="mono"
              ></textarea>
              <small>{{ phoneCount }} números ingresados</small>
            </div>

            <div class="example-card example-card--green">
              <h4><span>💡</span>Ejemplo de mensaje para múltiples destinatarios</h4>
              <div>
                <p>"¡Promoción especial! 30% de descuento en todos nuestros productos este fin de semana. Visítanos en Av. Arequipa 1234 o compra online. Código: PROMO30"</p>
                <small>154 caracteres • 1 SMS • Se enviará el mismo mensaje a todos los números</small>
              </div>
            </div>
          </ng-container>

          <div *ngIf="templates.length > 0 && mode !== 'file'" class="field">
            <label for="selectedTemplate">Usar plantilla (opcional)</label>
            <select id="selectedTemplate" name="selectedTemplate" [(ngModel)]="selectedTemplate" (ngModelChange)="handleTemplateSelect($event)">
              <option value="">Selecciona una plantilla</option>
              <option *ngFor="let template of templates" [value]="template.id">{{ template.name }}</option>
            </select>
          </div>

          <div *ngIf="mode !== 'file'" class="field">
            <label for="message">Mensaje</label>
            <textarea
              id="message"
              name="message"
              required
              rows="5"
              [(ngModel)]="message"
              placeholder="Escribe tu mensaje aquí..."
            ></textarea>
            <div class="field-meta">
              <small>{{ messageLength }} caracteres</small>
              <small>{{ smsCount }} SMS {{ messageLength > 160 ? '(mensaje largo)' : '' }}</small>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-card__top">
              <span>Resumen de envío</span>
              <strong>S/ {{ totalCost.toFixed(2) }}</strong>
            </div>

            <div class="summary-grid">
              <div>
                <p>Destinatarios</p>
                <strong>{{ phoneCount }}</strong>
              </div>
              <div *ngIf="mode !== 'file'">
                <p>SMS por mensaje</p>
                <strong>{{ smsCount }}</strong>
              </div>
              <div *ngIf="mode === 'file'">
                <p>Total SMS</p>
                <strong>{{ totalFileSms }}</strong>
              </div>
              <div>
                <p>Créditos disponibles</p>
                <strong>{{ credits.toFixed(0) }}</strong>
              </div>
              <div>
                <p>Créditos después</p>
                <strong>{{ afterCredits.toFixed(0) }}</strong>
              </div>
            </div>
          </div>

          <button
            type="submit"
            class="submit-button"
            [disabled]="sending || phoneCount === 0"
          >
            <ng-container *ngIf="sending; else sendLabel">
              <span class="small-spinner"></span>
              Enviando...
            </ng-container>
            <ng-template #sendLabel>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m22 2-7 20-4-9-9-4Z"></path>
                <path d="M22 2 11 13"></path>
              </svg>
              Enviar {{ phoneCount }} SMS
            </ng-template>
          </button>
        </form>
      </section>

      <section class="info-card">
        <h3>Información importante</h3>
        <ul>
          <li><span>•</span>Cada SMS admite 160 caracteres (mensajes largos se dividen automáticamente)</li>
          <li><span>•</span>Costo: S/ 0.08 por SMS - El mejor precio del Perú</li>
          <li><span>•</span>Entrega en menos de 5 segundos con tasa de éxito del 99.9%</li>
          <li><span>•</span><strong>Múltiple:</strong> Sube archivos .txt o .csv con números para enviar el mismo mensaje a todos</li>
          <li><span>•</span><strong>Desde Fichero:</strong> Sube un Excel con columnas Teléfono y Mensaje para enviar mensajes personalizados</li>
          <li><span>•</span>Los envíos desde fichero quedan registrados como campañas para consulta futura</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    * {
      box-sizing: border-box;
    }

    svg {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .send-page {
      display: grid;
      gap: 24px;
    }

    h1,
    h3,
    h4,
    p {
      margin: 0;
    }

    h1 {
      color: #111827;
      font-size: 30px;
      font-weight: 700;
      line-height: 1.2;
    }

    .page-subtitle {
      margin-top: 4px;
      color: #4b5563;
    }

    .alert {
      display: flex;
      align-items: center;
      border: 1px solid;
      border-radius: 8px;
      padding: 16px;
    }

    .alert svg {
      width: 20px;
      height: 20px;
      margin-right: 12px;
      flex: 0 0 auto;
    }

    .alert--success {
      border-color: #bbf7d0;
      background: #f0fdf4;
      color: #166534;
    }

    .alert--success p {
      color: #14532d;
      font-weight: 500;
    }

    .alert--success span {
      color: #15803d;
      font-size: 14px;
    }

    .alert--error {
      border-color: #fecaca;
      background: #fef2f2;
      color: #dc2626;
    }

    .alert--error p {
      color: #b91c1c;
    }

    .send-card,
    .info-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .tabs {
      border-bottom: 1px solid #e5e7eb;
      display: flex;
    }

    .tabs button {
      flex: 1;
      border: 0;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: #4b5563;
      cursor: pointer;
      padding: 16px 24px;
      font: inherit;
      font-weight: 500;
      transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
    }

    .tabs button:hover {
      background: #f9fafb;
    }

    .tabs svg {
      display: block;
      width: 20px;
      height: 20px;
      margin: 0 auto 4px;
    }

    .tabs .tab--active {
      border-color: #2563eb;
      background: #eff6ff;
      color: #2563eb;
    }

    .send-form {
      display: grid;
      gap: 24px;
      padding: 24px;
    }

    .field label {
      display: block;
      margin-bottom: 8px;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
    }

    .field input,
    .field select,
    .field textarea {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #ffffff;
      color: #111827;
      font: inherit;
      padding: 8px 16px;
      outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    .field textarea {
      resize: none;
    }

    .field input:focus,
    .field select:focus,
    .field textarea:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .field small,
    .field-meta small {
      color: #6b7280;
      font-size: 12px;
    }

    .field__header,
    .field-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .field__header label {
      margin-bottom: 0;
    }

    .field-meta {
      margin: 8px 0 0;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 14px;
    }

    .file-inline {
      display: inline-flex !important;
      align-items: center;
      border-radius: 8px;
      color: #2563eb !important;
      cursor: pointer;
      font-size: 14px !important;
      padding: 6px 12px;
      transition: background 160ms ease;
    }

    .file-inline:hover {
      background: #eff6ff;
    }

    .file-inline svg {
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .example-card {
      border: 1px solid;
      border-radius: 8px;
      padding: 16px;
    }

    .example-card--blue {
      border-color: #bfdbfe;
      background: linear-gradient(90deg, #eff6ff, #eef2ff);
    }

    .example-card--green {
      border-color: #bbf7d0;
      background: linear-gradient(90deg, #f0fdf4, #ecfdf5);
    }

    .example-card h4 {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      color: #111827;
      font-size: 14px;
      font-weight: 700;
    }

    .example-card h4 span {
      margin-right: 8px;
    }

    .example-card > div {
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      padding: 12px;
    }

    .example-card p {
      color: #374151;
      font-size: 14px;
      font-style: italic;
    }

    .example-card small {
      display: block;
      margin-top: 8px;
      color: #6b7280;
      font-size: 12px;
    }

    .upload-box {
      border: 2px dashed #93c5fd;
      border-radius: 8px;
      background: #eff6ff;
      padding: 24px;
    }

    .upload-box__header {
      margin-bottom: 16px;
      text-align: center;
    }

    .upload-box__header > svg {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      color: #2563eb;
    }

    .upload-box h3 {
      margin-bottom: 8px;
      color: #111827;
      font-weight: 700;
    }

    .upload-box p {
      margin-bottom: 16px;
      color: #4b5563;
      font-size: 14px;
    }

    .upload-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      border: 0;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      font-weight: 500;
      padding: 8px 16px;
      transition: background 160ms ease;
    }

    .btn svg {
      width: 16px;
      height: 16px;
      margin-right: 8px;
    }

    .btn--blue {
      background: #2563eb;
    }

    .btn--blue:hover {
      background: #1d4ed8;
    }

    .btn--green {
      background: #16a34a;
    }

    .btn--green:hover {
      background: #15803d;
    }

    .format-info {
      border-radius: 8px;
      background: #ffffff;
      color: #4b5563;
      font-size: 12px;
      padding: 16px;
    }

    .format-info p {
      margin-bottom: 8px;
      color: #111827;
      font-weight: 500;
    }

    .format-info ul,
    .info-card ul {
      display: grid;
      gap: 4px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .preview-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
    }

    .preview-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid #e5e7eb;
      padding: 12px 16px;
    }

    .preview-card__header h3 {
      color: #111827;
      font-weight: 700;
    }

    .preview-card__header p {
      color: #4b5563;
      font-size: 14px;
    }

    .preview-card__header button {
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #dc2626;
      cursor: pointer;
      padding: 8px;
      transition: background 160ms ease, color 160ms ease;
    }

    .preview-card__header button:hover {
      background: #fef2f2;
      color: #b91c1c;
    }

    .preview-card__header svg {
      width: 20px;
      height: 20px;
    }

    .preview-list {
      max-height: 320px;
      overflow-y: auto;
    }

    .preview-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid #e5e7eb;
      padding: 12px 16px;
    }

    .preview-row:first-child {
      border-top: 0;
    }

    .preview-row:hover {
      background: #f9fafb;
    }

    .preview-row__phone {
      color: #2563eb;
      flex: 0 0 auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 14px;
      font-weight: 500;
    }

    .preview-row__message {
      min-width: 0;
      flex: 1;
    }

    .preview-row__message p {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      color: #374151;
      font-size: 14px;
    }

    .preview-row__message span {
      display: block;
      margin-top: 4px;
      color: #6b7280;
      font-size: 12px;
    }

    .preview-more {
      background: #f9fafb;
      color: #4b5563;
      font-size: 14px;
      padding: 12px 16px;
      text-align: center;
    }

    .summary-card {
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      background: #eff6ff;
      padding: 16px;
    }

    .summary-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 8px;
    }

    .summary-card__top span {
      color: #111827;
      font-weight: 500;
    }

    .summary-card__top strong {
      color: #2563eb;
      font-size: 24px;
      line-height: 1.2;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      font-size: 14px;
    }

    .summary-grid p {
      color: #4b5563;
    }

    .summary-grid strong {
      color: #111827;
      font-weight: 500;
    }

    .submit-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      border: 0;
      border-radius: 8px;
      background: #2563eb;
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      font-weight: 500;
      padding: 12px 24px;
      transition: background 160ms ease, opacity 160ms ease;
    }

    .submit-button:hover {
      background: #1d4ed8;
    }

    .submit-button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .submit-button svg {
      width: 20px;
      height: 20px;
      margin-right: 8px;
    }

    .small-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 8px;
      border: 0 solid transparent;
      border-bottom: 2px solid #ffffff;
      border-radius: 999px;
      animation: spin 800ms linear infinite;
    }

    .info-card {
      padding: 24px;
    }

    .info-card h3 {
      margin-bottom: 12px;
      color: #111827;
      font-weight: 700;
    }

    .info-card li {
      display: flex;
      align-items: flex-start;
      color: #4b5563;
      font-size: 14px;
    }

    .info-card li span {
      margin-right: 8px;
      color: #2563eb;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 640px) {
      .tabs button {
        padding: 14px 10px;
      }

      .upload-actions,
      .preview-row {
        flex-direction: column;
      }

      .btn,
      .summary-card__top {
        width: 100%;
      }

      .summary-card__top {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `]
})
export class SendSmsPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  mode: SendMode = 'single';
  recipient = '';
  message = '';
  multiplePhones = '';
  campaignName = '';
  fileMessages: FileMessage[] = [];
  templates: Array<{ id: string; name: string; content: string }> = [];
  selectedTemplate = '';
  sending = false;
  success = false;
  error = '';
  profile: SendProfile | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadProfileCredits();
  }

  get messageLength(): number {
    return this.message.length;
  }

  get smsCount(): number {
    return this.smsSegments(this.message);
  }

  get phoneCount(): number {
    return this.mode === 'file' ? this.fileMessages.length : this.getPhonesList().length;
  }

  get totalFileSms(): number {
    return this.fileMessages.reduce((total, fm) => total + this.smsSegments(fm.message), 0);
  }

  get totalCost(): number {
    if (this.mode === 'file') {
      return this.fileMessages.reduce((total, fm) => total + this.smsSegments(fm.message) * 0.08, 0);
    }

    return this.getPhonesList().length * this.smsCount * 0.08;
  }

  get credits(): number {
    return Number(this.profile?.credits ?? 0);
  }

  get afterCredits(): number {
    return Math.max(0, this.credits - this.totalCost);
  }

  get previewMessages(): FileMessage[] {
    return this.fileMessages.slice(0, 10);
  }

  setMode(mode: SendMode): void {
    this.mode = mode;
    this.error = '';
    this.success = false;
  }

  handleTemplateSelect(templateId: string): void {
    const template = this.templates.find((item) => item.id === templateId);

    if (template) {
      this.message = template.content;
      this.selectedTemplate = templateId;
    }
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const phones = text
        .split(/[\n,;]/)
        .map((phone) => phone.trim())
        .filter((phone) => phone.length > 0);

      this.multiplePhones = phones.join('\n');
    };
    reader.readAsText(file);
    input.value = '';
  }

  handleExcelUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.error = '';

    if (file.size > 500 * 1024) {
      this.error = 'El archivo excede el tamaño máximo de 500KB';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const rows = text
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter((row) => row.length > 0)
        .map((row) => row.split(/,|;/).map((cell) => cell.trim()));

      if (rows.length < 2) {
        this.error = 'El archivo debe contener al menos una fila de datos además de los encabezados';
        return;
      }

      const messages = rows.slice(1).reduce<FileMessage[]>((items, row) => {
        if (row.length >= 2 && row[0] && row[1]) {
          items.push({
            phone: String(row[0]).trim(),
            message: String(row.slice(1).join(', ')).trim()
          });
        }

        return items;
      }, []);

      if (messages.length === 0) {
        this.error = 'No se encontraron datos válidos en el archivo';
        return;
      }

      this.fileMessages = messages;
      this.error = '';
    };
    reader.onerror = () => {
      this.error = 'Error al procesar el archivo';
    };
    reader.readAsText(file);
    input.value = '';
  }

  downloadTemplate(): void {
    const template = [
      ['Telefono', 'Mensaje'],
      ['+51987654321', 'Hola Juan, tenemos una promoción especial para ti'],
      ['+51976543210', 'Hola María, tu pedido está listo para recoger'],
      ['965432109', 'Estimado cliente, le recordamos su cita del día de mañana']
    ];

    const csv = template.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_sms.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  clearFileMessages(): void {
    this.fileMessages = [];
  }

  handleSend(): void {
    this.error = '';
    this.success = false;

    if (this.mode === 'file') {
      if (this.fileMessages.length === 0) {
        this.error = 'Debes cargar un archivo con los mensajes a enviar';
        return;
      }

      const invalidPhones = this.fileMessages.filter((fm) => !this.validatePhone(fm.phone));
      if (invalidPhones.length > 0) {
        this.error = `Números inválidos encontrados: ${invalidPhones.slice(0, 3).map((fm) => fm.phone).join(', ')}${invalidPhones.length > 3 ? '...' : ''}. Formato: +51987654321`;
        return;
      }
    } else {
      const phones = this.getPhonesList();

      if (phones.length === 0) {
        this.error = 'Debes ingresar al menos un número de teléfono';
        return;
      }

      const invalidPhones = phones.filter((phone) => !this.validatePhone(phone));
      if (invalidPhones.length > 0) {
        this.error = `Números inválidos: ${invalidPhones.slice(0, 3).join(', ')}${invalidPhones.length > 3 ? '...' : ''}. Formato: +51987654321`;
        return;
      }
    }

    if (this.credits < this.totalCost) {
      this.error = `Créditos insuficientes. Necesitas ${this.totalCost.toFixed(2)} SMS pero solo tienes ${this.credits.toFixed(2)}`;
      return;
    }

    this.error = 'El envío real se conectará en la siguiente fase.';
  }

  smsSegments(value: string): number {
    return Math.ceil(value.length / 160) || 1;
  }

  private validatePhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\s+/g, '');
    return /^\+?51[0-9]{9}$/.test(cleanPhone);
  }

  private getPhonesList(): string[] {
    if (this.mode === 'single') {
      return this.recipient.trim() ? [this.recipient.trim()] : [];
    }

    if (this.mode === 'file') {
      return this.fileMessages.map((fm) => fm.phone);
    }

    return this.multiplePhones
      .split('\n')
      .map((phone) => phone.trim())
      .filter((phone) => phone.length > 0);
  }

  private async loadProfileCredits(): Promise<void> {
    try {
      const { data: sessionData } = await this.supabase.instance.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) return;

      const { data } = await this.supabase.instance
        .from('profiles')
        .select('id, credits')
        .eq('id', user.id)
        .maybeSingle();

      this.profile = (data as SendProfile | null) ?? null;
    } catch {
      this.profile = null;
    }
  }
}

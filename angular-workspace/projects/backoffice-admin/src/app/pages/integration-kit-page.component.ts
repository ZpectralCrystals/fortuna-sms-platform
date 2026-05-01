import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

interface IntegrationFile {
  name: string;
  createdAt: string;
  size: number;
  publicUrl: string;
}

@Component({
  selector: 'bo-integration-kit-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="integration-page">
      <div class="page-header">
        <div>
          <h1>Kit de Integración</h1>
          <p>Gestiona y comparte el kit de integración con Corporate SMS API</p>
        </div>
      </div>

      <div class="info-box">
        <div class="info-row">
          <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
          <div class="info-content">
            <h3>¿Qué incluye el kit de integración?</h3>
            <ul>
              <li>Documentación completa de integración</li>
              <li>Guías paso a paso y checklists</li>
              <li>Scripts SQL de configuración</li>
              <li>Ejemplos de endpoints y testing</li>
              <li>Instrucciones de entrega al equipo</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="upload-card">
        <h2>Subir Nuevo Kit</h2>

        <div class="drop-zone">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="m17 8-5-5-5 5" />
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          </svg>
          <div class="upload-action">
            <label for="file-upload" class="upload-button">
              {{ uploading ? 'Subiendo...' : 'Seleccionar archivo ZIP' }}
            </label>
            <input
              id="file-upload"
              type="file"
              name="file-upload"
              accept=".zip"
              class="sr-only"
              [disabled]="uploading"
              (change)="handleFileInput($event)"
            />
          </div>
          <p>Solo archivos ZIP, máximo 10MB</p>
        </div>

        <div *ngIf="uploadStatus" class="upload-status" [class.success]="uploadStatus.type === 'success'" [class.error]="uploadStatus.type === 'error'">
          <p>{{ uploadStatus.message }}</p>
        </div>
      </div>

      <div class="kits-card">
        <div class="kits-header">
          <h2>Kits Disponibles</h2>
        </div>

        <div *ngIf="loadingFiles" class="files-loading">
          <div class="small-spinner"></div>
          <p>Cargando archivos...</p>
        </div>

        <div *ngIf="!loadingFiles && files.length === 0" class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
          </svg>
          <p>No hay kits disponibles</p>
          <span>Sube un archivo ZIP para comenzar</span>
        </div>

        <div *ngIf="!loadingFiles && files.length > 0" class="files-list">
          <div *ngFor="let file of files; let index = index" class="file-item">
            <div class="file-row">
              <div class="file-main">
                <div class="file-title-row">
                  <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m7.5 4.27 9 5.15" />
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                  <div>
                    <h3>{{ file.name }}</h3>
                    <p>Subido el {{ formatDate(file.createdAt) }} • {{ formatFileSize(file.size) }}</p>
                  </div>
                </div>

                <div class="url-box">
                  <p>URL Pública:</p>
                  <div class="url-row">
                    <code>{{ file.publicUrl }}</code>
                    <button type="button" (click)="showBlockedAction()">Copiar</button>
                  </div>
                </div>
              </div>

              <div class="file-actions">
                <button type="button" class="open-button" (click)="showBlockedAction()">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                  Abrir
                </button>
                <button type="button" class="retrieve-button" (click)="showBlockedAction()">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 15V3" />
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                  </svg>
                  Descargar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="instructions-box">
        <div class="instructions-row">
          <svg class="instructions-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
          </svg>
          <div class="instructions-content">
            <h3>Instrucciones de Entrega</h3>
            <ol>
              <li>Copia la URL pública del kit más reciente</li>
              <li>Envía el link al equipo de Corporate SMS API por email o chat</li>
              <li>El equipo podrá descargar el kit directamente desde el link</li>
              <li>No se requiere autenticación para descargar</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .integration-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    h1 {
      color: #111827;
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 2.25rem;
      margin: 0;
    }

    .page-header p {
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin: 0.25rem 0 0;
    }

    .info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .info-row,
    .instructions-row {
      display: flex;
    }

    .info-icon,
    .instructions-icon {
      flex: 0 0 auto;
      height: 1.25rem;
      margin-top: 0.125rem;
      width: 1.25rem;
    }

    .info-icon {
      color: #2563eb;
    }

    .info-content,
    .instructions-content {
      flex: 1 1 auto;
      margin-left: 0.75rem;
    }

    .info-content h3,
    .instructions-content h3 {
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      margin: 0;
    }

    .info-content h3 {
      color: #1e3a8a;
    }

    .info-content div,
    .info-content ul {
      color: #1d4ed8;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .info-content ul,
    .instructions-content ol {
      margin: 0.5rem 0 0;
      padding-left: 1.25rem;
    }

    .info-content li,
    .instructions-content li {
      margin-top: 0.25rem;
    }

    .upload-card,
    .kits-card {
      background: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .upload-card {
      padding: 1.5rem;
    }

    .upload-card h2,
    .kits-header h2 {
      color: #111827;
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.75rem;
      margin: 0;
    }

    .upload-card h2 {
      margin-bottom: 1rem;
    }

    .drop-zone {
      border: 2px dashed #d1d5db;
      border-radius: 0.5rem;
      padding: 2rem;
      text-align: center;
    }

    .upload-icon,
    .empty-icon {
      color: #9ca3af;
      height: 3rem;
      margin: 0 auto;
      width: 3rem;
    }

    .upload-action {
      margin-top: 1rem;
    }

    .upload-button {
      align-items: center;
      background: #2563eb;
      border: 1px solid transparent;
      border-radius: 0.375rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      padding: 0.5rem 1rem;
      transition: background-color 150ms ease;
    }

    .upload-button:hover {
      background: #1d4ed8;
    }

    .sr-only {
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      width: 1px;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    .drop-zone p {
      color: #6b7280;
      font-size: 0.75rem;
      line-height: 1rem;
      margin: 0.5rem 0 0;
    }

    .upload-status {
      border-radius: 0.375rem;
      margin-top: 1rem;
      padding: 1rem;
    }

    .upload-status.success {
      background: #f0fdf4;
      color: #166534;
    }

    .upload-status.error {
      background: #fef2f2;
      color: #991b1b;
    }

    .upload-status p {
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin: 0;
    }

    .kits-card {
      overflow: hidden;
    }

    .kits-header {
      border-bottom: 1px solid #e5e7eb;
      padding: 1rem 1.5rem;
    }

    .files-loading,
    .empty-state {
      padding: 2rem;
      text-align: center;
    }

    .small-spinner {
      animation: spin 1s linear infinite;
      border-bottom: 2px solid #2563eb;
      border-radius: 9999px;
      height: 2rem;
      margin: 0 auto;
      width: 2rem;
    }

    .files-loading p,
    .empty-state p {
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin: 0.5rem 0 0;
    }

    .empty-state span {
      color: #9ca3af;
      display: block;
      font-size: 0.75rem;
      line-height: 1rem;
      margin-top: 0.25rem;
    }

    .files-list {
      border-top: 1px solid #e5e7eb;
    }

    .file-item {
      padding: 1.5rem;
      transition: background-color 150ms ease;
    }

    .file-item + .file-item {
      border-top: 1px solid #e5e7eb;
    }

    .file-item:hover {
      background: #f9fafb;
    }

    .file-row {
      align-items: flex-start;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .file-main {
      flex: 1 1 auto;
      min-width: 0;
    }

    .file-title-row {
      align-items: center;
      display: flex;
    }

    .file-icon {
      color: #9ca3af;
      flex: 0 0 auto;
      height: 1.25rem;
      margin-right: 0.75rem;
      width: 1.25rem;
    }

    .file-title-row h3 {
      color: #111827;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      margin: 0;
    }

    .file-title-row p {
      color: #6b7280;
      font-size: 0.75rem;
      line-height: 1rem;
      margin: 0.25rem 0 0;
    }

    .url-box {
      background: #f9fafb;
      border-radius: 0.25rem;
      margin-top: 0.75rem;
      padding: 0.75rem;
    }

    .url-box p {
      color: #374151;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1rem;
      margin: 0 0 0.25rem;
    }

    .url-row {
      align-items: center;
      display: flex;
      gap: 0.5rem;
    }

    .url-row code {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 0.25rem;
      color: #4b5563;
      flex: 1 1 auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 0.75rem;
      line-height: 1rem;
      overflow-x: auto;
      padding: 0.25rem 0.5rem;
    }

    .url-row button {
      background: transparent;
      border: 0;
      border-radius: 0.25rem;
      color: #2563eb;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1rem;
      padding: 0.25rem 0.75rem;
    }

    .url-row button:hover {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .file-actions {
      display: flex;
      flex: 0 0 auto;
      gap: 0.5rem;
      margin-left: 1rem;
    }

    .open-button,
    .retrieve-button {
      align-items: center;
      border-radius: 0.375rem;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      padding: 0.5rem 0.75rem;
    }

    .open-button {
      background: #fff;
      border: 1px solid #d1d5db;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      color: #374151;
    }

    .open-button:hover {
      background: #f9fafb;
    }

    .retrieve-button {
      background: #2563eb;
      border: 1px solid transparent;
      color: #fff;
    }

    .retrieve-button:hover {
      background: #1d4ed8;
    }

    .action-icon {
      height: 1rem;
      margin-right: 0.25rem;
      width: 1rem;
    }

    .instructions-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .instructions-icon {
      color: #d97706;
    }

    .instructions-content h3 {
      color: #78350f;
    }

    .instructions-content ol {
      color: #b45309;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    @media (max-width: 767px) {
      .file-row,
      .file-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .file-actions {
        margin-left: 0;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class IntegrationKitPageComponent implements OnInit {
  files: IntegrationFile[] = [];
  loadingFiles = true;
  uploading = false;
  uploadStatus: { type: 'success' | 'error'; message: string } | null = null;

  ngOnInit(): void {
    this.files = [];
    this.loadingFiles = false;
  }

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith('.zip')) {
      this.uploadStatus = { type: 'error', message: 'Solo se permiten archivos ZIP' };
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.uploadStatus = { type: 'error', message: 'Solo archivos ZIP, máximo 10MB' };
      input.value = '';
      return;
    }

    this.uploading = true;
    this.uploadStatus = {
      type: 'success',
      message: 'La carga segura del kit de integración se conectará cuando exista backend y storage definidos.',
    };
    this.uploading = false;
    input.value = '';
  }

  showBlockedAction(): void {
    this.uploadStatus = {
      type: 'error',
      message: 'La gestión segura de archivos se conectará cuando exista backend y URLs públicas definidas.',
    };
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '@sms-fortuna/shared';

type TemplateCategory = 'marketing' | 'transactional' | 'notification';

interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  category: TemplateCategory | string;
  variables: unknown[] | null;
  created_at: string;
}

interface TemplateFormData {
  name: string;
  content: string;
  category: TemplateCategory;
}

@Component({
  selector: 'sms-templates-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="templates-page">
      <header class="templates-header">
        <div>
          <h1>Plantillas de Mensajes</h1>
          <p>Crea y administra plantillas reutilizables</p>
        </div>
        <button type="button" class="primary-button" (click)="openCreateModal()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
          </svg>
          Nueva Plantilla
        </button>
      </header>

      <p *ngIf="noticeMessage" class="notice-message">
        {{ noticeMessage }}
      </p>

      <section class="templates-grid" aria-label="Plantillas guardadas">
        <div *ngIf="templates.length === 0" class="empty-card">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <path d="M14 2v6h6"></path>
            <path d="M16 13H8"></path>
            <path d="M16 17H8"></path>
            <path d="M10 9H8"></path>
          </svg>
          <p>No tienes plantillas aún</p>
          <button type="button" class="primary-button" (click)="openCreateModal()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
            Crear primera plantilla
          </button>
        </div>

        <article *ngFor="let template of templates" class="template-card">
          <div class="template-card__header">
            <div class="template-card__title">
              <h3>{{ template.name }}</h3>
              <span [ngClass]="categoryClass(template.category)">
                {{ categoryLabel(template.category) }}
              </span>
            </div>

            <div class="template-actions">
              <button
                type="button"
                class="icon-button icon-button--edit"
                title="Editar"
                (click)="openEditModal(template)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
              </button>
              <button
                type="button"
                class="icon-button icon-button--delete"
                title="Eliminar"
                (click)="deleteTemplate(template.id)"
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
          </div>

          <div class="template-content">
            <p>{{ template.content }}</p>
          </div>

          <div class="template-meta">
            <span>{{ template.content.length }} caracteres</span>
            <span>{{ formatDate(template.created_at) }}</span>
          </div>

          <button type="button" class="use-button" (click)="showUseNotice()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m22 2-7 20-4-9-9-4Z"></path>
              <path d="M22 2 11 13"></path>
            </svg>
            Usar plantilla
          </button>
        </article>
      </section>

      <div *ngIf="showModal" class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="modal-card">
          <h2>{{ editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla' }}</h2>

          <form class="template-form" (ngSubmit)="saveTemplate()">
            <label>
              <span>Nombre de la plantilla</span>
              <input
                type="text"
                name="templateName"
                [(ngModel)]="formData.name"
                required
                placeholder="Ej: Confirmación de pedido"
              />
            </label>

            <label>
              <span>Categoría</span>
              <select
                name="templateCategory"
                [(ngModel)]="formData.category"
              >
                <option value="marketing">Marketing</option>
                <option value="transactional">Transaccional</option>
                <option value="notification">Notificación</option>
              </select>
            </label>

            <label>
              <span>Contenido</span>
              <textarea
                name="templateContent"
                [(ngModel)]="formData.content"
                required
                rows="6"
                placeholder="Escribe el contenido de tu plantilla..."
              ></textarea>
              <small>{{ formData.content.length }} caracteres</small>
            </label>

            <div class="tip-box">
              <p>
                <strong>Consejo:</strong> Usa variables como {{ '{nombre}' }}, {{ '{codigo}' }} para
                personalizar tus mensajes.
              </p>
            </div>

            <p *ngIf="formError" class="form-error">
              {{ formError }}
            </p>

            <div class="modal-actions">
              <button type="button" class="secondary-button" (click)="closeModal()">
                Cancelar
              </button>
              <button type="submit" class="primary-submit" [disabled]="loading">
                {{ loading ? 'Guardando...' : editingTemplate ? 'Actualizar' : 'Crear' }}
              </button>
            </div>
          </form>
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
    p {
      margin: 0;
    }

    .templates-page {
      display: grid;
      gap: 24px;
    }

    .templates-header {
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

    .templates-header p {
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

    .notice-message {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      color: #1e40af;
      font-size: 14px;
      line-height: 20px;
      padding: 12px 16px;
    }

    .templates-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .empty-card {
      align-items: center;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      display: flex;
      flex-direction: column;
      grid-column: 1 / -1;
      padding: 48px;
      text-align: center;
    }

    .empty-card > svg {
      color: #9ca3af;
      height: 48px;
      margin-bottom: 12px;
      width: 48px;
    }

    .empty-card p {
      color: #4b5563;
      line-height: 24px;
      margin-bottom: 16px;
    }

    .template-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      padding: 24px;
      transition: box-shadow 160ms ease, transform 160ms ease;
    }

    .template-card:hover {
      box-shadow: 0 10px 15px rgba(15, 23, 42, 0.1);
    }

    .template-card__header {
      align-items: flex-start;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .template-card__title {
      flex: 1;
      min-width: 0;
    }

    .template-card h3 {
      color: #111827;
      font-weight: 700;
      line-height: 24px;
      margin-bottom: 8px;
    }

    .category-pill {
      border-radius: 999px;
      display: inline-block;
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
      padding: 4px 8px;
    }

    .category-pill--marketing {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .category-pill--transactional {
      background: #dcfce7;
      color: #15803d;
    }

    .category-pill--notification {
      background: #f3e8ff;
      color: #7e22ce;
    }

    .category-pill--default {
      background: #f3f4f6;
      color: #374151;
    }

    .template-actions {
      display: flex;
      gap: 4px;
    }

    .icon-button {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      justify-content: center;
      padding: 8px;
      transition: background-color 160ms ease;
    }

    .icon-button svg {
      height: 16px;
      width: 16px;
    }

    .icon-button--edit {
      color: #2563eb;
    }

    .icon-button--edit:hover {
      background: #eff6ff;
    }

    .icon-button--delete {
      color: #dc2626;
    }

    .icon-button--delete:hover {
      background: #fef2f2;
    }

    .template-content {
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 16px;
      padding: 12px;
    }

    .template-content p {
      color: #374151;
      display: -webkit-box;
      font-size: 14px;
      line-height: 20px;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4;
      overflow: hidden;
    }

    .template-meta {
      align-items: center;
      color: #6b7280;
      display: flex;
      font-size: 12px;
      justify-content: space-between;
      line-height: 16px;
      gap: 12px;
    }

    .use-button {
      align-items: center;
      background: #ffffff;
      border: 1px solid #2563eb;
      border-radius: 8px;
      color: #2563eb;
      cursor: pointer;
      display: flex;
      font: inherit;
      font-weight: 500;
      justify-content: center;
      line-height: 24px;
      margin-top: 16px;
      padding: 8px 16px;
      transition: background-color 160ms ease;
      width: 100%;
    }

    .use-button:hover {
      background: #eff6ff;
    }

    .use-button svg {
      height: 16px;
      margin-right: 8px;
      width: 16px;
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
      max-height: 90vh;
      max-width: 672px;
      overflow-y: auto;
      padding: 24px;
      width: 100%;
    }

    .modal-card h2 {
      color: #111827;
      font-size: 24px;
      font-weight: 700;
      line-height: 32px;
      margin-bottom: 24px;
    }

    .template-form {
      display: grid;
      gap: 16px;
    }

    label {
      display: block;
    }

    label span {
      color: #374151;
      display: block;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      margin-bottom: 8px;
    }

    input,
    select,
    textarea {
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

    textarea {
      resize: none;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
      outline: none;
    }

    small {
      color: #6b7280;
      display: block;
      font-size: 14px;
      line-height: 20px;
      margin-top: 4px;
    }

    .tip-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
    }

    .tip-box p {
      color: #1e40af;
      font-size: 14px;
      line-height: 20px;
    }

    .form-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #b91c1c;
      font-size: 14px;
      line-height: 20px;
      padding: 12px 16px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
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

    @media (min-width: 768px) {
      .templates-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .templates-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .templates-header,
      .template-meta,
      .modal-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .primary-button {
        width: 100%;
      }
    }
  `]
})
export class TemplatesPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  templates: MessageTemplate[] = [];
  showModal = false;
  editingTemplate: MessageTemplate | null = null;
  formData: TemplateFormData = this.emptyForm();
  loading = false;
  formError = '';
  noticeMessage = '';

  ngOnInit(): void {
    void this.fetchTemplates();
  }

  openCreateModal(): void {
    this.editingTemplate = null;
    this.formData = this.emptyForm();
    this.formError = '';
    this.showModal = true;
  }

  openEditModal(template: MessageTemplate): void {
    this.editingTemplate = template;
    this.formData = {
      name: template.name,
      content: template.content,
      category: this.normalizeCategory(template.category)
    };
    this.formError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingTemplate = null;
    this.formData = this.emptyForm();
    this.formError = '';
  }

  async saveTemplate(): Promise<void> {
    this.formError = '';
    this.noticeMessage = '';

    const userId = await this.getCurrentUserId();
    if (!userId) {
      this.formError = 'No se pudo guardar la plantilla.';
      return;
    }

    this.loading = true;

    try {
      if (this.editingTemplate) {
        const { error } = await this.supabase.instance
          .from('templates')
          .update({
            name: this.formData.name,
            content: this.formData.content,
            category: this.formData.category
          })
          .eq('id', this.editingTemplate.id)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await this.supabase.instance
          .from('templates')
          .insert({
            user_id: userId,
            name: this.formData.name,
            content: this.formData.content,
            category: this.formData.category,
            variables: []
          });

        if (error) {
          throw error;
        }
      }

      this.closeModal();
      await this.fetchTemplates();
    } catch {
      this.formError = 'No se pudo guardar la plantilla.';
    } finally {
      this.loading = false;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    if (!window.confirm('¿Estás seguro de eliminar esta plantilla?')) {
      return;
    }

    const userId = await this.getCurrentUserId();
    if (!userId) {
      this.noticeMessage = 'No se pudo eliminar la plantilla.';
      return;
    }

    try {
      const { error } = await this.supabase.instance
        .from('templates')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      await this.fetchTemplates();
    } catch {
      this.noticeMessage = 'No se pudo eliminar la plantilla.';
    }
  }

  showUseNotice(): void {
    this.noticeMessage = 'La acción Usar plantilla se conectará en una siguiente fase.';
  }

  categoryClass(category: string): string {
    return `category-pill category-pill--${this.normalizeCategory(category)}`;
  }

  categoryLabel(category: string): string {
    switch (category) {
      case 'marketing':
        return 'Marketing';
      case 'transactional':
        return 'Transaccional';
      case 'notification':
        return 'Notificación';
      default:
        return category;
    }
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private async fetchTemplates(): Promise<void> {
    this.noticeMessage = '';

    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        this.templates = [];
        return;
      }

      const { data, error } = await this.supabase.instance
        .from('templates')
        .select('id, user_id, name, content, category, variables, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.templates = [];
        return;
      }

      this.templates = ((data as MessageTemplate[] | null) ?? []).map((template) => ({
        ...template,
        name: template.name ?? '',
        content: template.content ?? '',
        category: template.category ?? 'marketing'
      }));
    } catch {
      this.templates = [];
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data } = await this.supabase.instance.auth.getSession();
      return data.session?.user?.id ?? null;
    } catch {
      return null;
    }
  }

  private normalizeCategory(category: string): TemplateCategory {
    if (
      category === 'marketing' ||
      category === 'transactional' ||
      category === 'notification'
    ) {
      return category;
    }

    return 'marketing';
  }

  private emptyForm(): TemplateFormData {
    return {
      name: '',
      content: '',
      category: 'marketing'
    };
  }
}

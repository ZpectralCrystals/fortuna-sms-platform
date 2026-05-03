import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SmsService, SmsTemplate, SmsTemplateCategory } from '@sms-fortuna/shared';

interface TemplateFormData {
  name: string;
  content: string;
  category: SmsTemplateCategory;
}

interface TemplateCategoryOption {
  value: SmsTemplateCategory | 'all';
  label: string;
}

@Component({
  selector: 'sms-templates-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './templates-page.component.html',
  styleUrl: './templates-page.component.scss'
})
export class TemplatesPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly smsService = inject(SmsService);

  readonly categories: TemplateCategoryOption[] = [
    { value: 'all', label: 'Todas' },
    { value: 'general', label: 'General' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'cobranza', label: 'Cobranza' },
    { value: 'recordatorio', label: 'Recordatorio' },
    { value: 'soporte', label: 'Soporte' },
    { value: 'otro', label: 'Otro' }
  ];

  templates: SmsTemplate[] = [];
  categoryFilter: SmsTemplateCategory | 'all' = 'all';
  searchTerm = '';
  showModal = false;
  editingTemplate: SmsTemplate | null = null;
  formData: TemplateFormData = this.emptyForm();
  loading = false;
  saving = false;
  formError = '';
  noticeMessage = '';

  async ngOnInit(): Promise<void> {
    await this.fetchTemplates();
  }

  get filteredTemplates(): SmsTemplate[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.templates.filter((template) => {
      const matchesCategory = this.categoryFilter === 'all' || template.category === this.categoryFilter;
      const matchesSearch = !search ||
        template.name.toLowerCase().includes(search) ||
        template.content.toLowerCase().includes(search) ||
        this.categoryLabel(template.category).toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }

  get formVariables(): string[] {
    return this.extractVariables(this.formData.content);
  }

  get formPreview(): string {
    return this.previewTemplateContent(this.formData.content);
  }

  openCreateModal(): void {
    this.editingTemplate = null;
    this.formData = this.emptyForm();
    this.formError = '';
    this.noticeMessage = '';
    this.showModal = true;
  }

  openEditModal(template: SmsTemplate): void {
    this.editingTemplate = template;
    this.formData = {
      name: template.name,
      content: template.content,
      category: template.category
    };
    this.formError = '';
    this.noticeMessage = '';
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

    const validationError = this.validateForm();
    if (validationError) {
      this.formError = validationError;
      return;
    }

    this.saving = true;

    try {
      const payload = {
        name: this.formData.name,
        content: this.formData.content,
        category: this.formData.category,
        variables: this.formVariables
      };

      if (this.editingTemplate) {
        await this.smsService.updateTemplate(this.editingTemplate.id, payload);
        this.noticeMessage = 'Plantilla actualizada.';
      } else {
        await this.smsService.createTemplate(payload);
        this.noticeMessage = 'Plantilla creada.';
      }

      this.closeModal();
      await this.fetchTemplates(false);
    } catch (error) {
      this.formError = error instanceof Error
        ? error.message
        : 'No se pudo guardar la plantilla.';
    } finally {
      this.saving = false;
    }
  }

  async deleteTemplate(template: SmsTemplate): Promise<void> {
    if (!window.confirm(`Eliminar plantilla "${template.name}"?`)) {
      return;
    }

    this.noticeMessage = '';

    try {
      await this.smsService.deleteTemplate(template.id);
      this.noticeMessage = 'Plantilla eliminada.';
      await this.fetchTemplates(false);
    } catch (error) {
      this.noticeMessage = error instanceof Error
        ? error.message
        : 'No se pudo eliminar la plantilla.';
    }
  }

  async useTemplate(template: SmsTemplate): Promise<void> {
    await this.router.navigate(['/dashboard/send'], {
      queryParams: { templateId: template.id }
    });
  }

  categoryClass(category: string): string {
    return `category-pill category-pill--${this.normalizeCategory(category)}`;
  }

  categoryLabel(category: string): string {
    const match = this.categories.find((item) => item.value === category);
    return match?.label ?? 'General';
  }

  formatDate(value: string): string {
    if (!value) return '-';

    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  smsSegments(value: string): number {
    return this.smsService.calculateSegments(value);
  }

  extractVariables(content: string): string[] {
    return this.smsService.extractTemplateVariables(content);
  }

  templateVariables(template: SmsTemplate): string[] {
    return template.variables.length > 0
      ? template.variables
      : this.extractVariables(template.content);
  }

  previewTemplateContent(content: string): string {
    return this.smsService.renderTemplateExample(content);
  }

  getExampleValue(variableName: string): string {
    return this.smsService.getExampleValue(variableName);
  }

  private async fetchTemplates(showLoader = true): Promise<void> {
    if (showLoader) {
      this.loading = true;
    }

    try {
      this.templates = await this.smsService.listTemplates();
    } catch (error) {
      this.templates = [];
      this.noticeMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar las plantillas.';
    } finally {
      this.loading = false;
    }
  }

  private validateForm(): string {
    this.formData.name = this.formData.name.trim();
    this.formData.content = this.formData.content.trim();

    if (!this.formData.name) {
      return 'El nombre es requerido.';
    }

    if (!this.formData.content) {
      return 'El contenido es requerido.';
    }

    if (this.formData.content.length > 480) {
      return 'El contenido no debe superar 480 caracteres.';
    }

    if (!this.normalizeCategory(this.formData.category)) {
      return 'La categoría es requerida.';
    }

    return '';
  }

  private normalizeCategory(category: string): SmsTemplateCategory {
    if (
      category === 'general' ||
      category === 'marketing' ||
      category === 'cobranza' ||
      category === 'recordatorio' ||
      category === 'soporte' ||
      category === 'otro'
    ) {
      return category;
    }

    return 'general';
  }

  private emptyForm(): TemplateFormData {
    return {
      name: '',
      content: '',
      category: 'general'
    };
  }
}

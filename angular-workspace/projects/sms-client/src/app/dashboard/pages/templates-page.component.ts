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
  templateUrl: './templates-page.component.html',
  styleUrl: './templates-page.component.scss'
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

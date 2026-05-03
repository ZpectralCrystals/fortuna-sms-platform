import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SmsSendResult, SmsService, SmsTemplate, SupabaseService } from '@sms-fortuna/shared';

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
  templateUrl: './send-sms-page.component.html',
  styleUrl: './send-sms-page.component.scss'
})
export class SendSmsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);
  private readonly smsService = inject(SmsService);

  mode: SendMode = 'single';
  recipient = '';
  manualMessage = '';
  multiplePhones = '';
  campaignName = '';
  fileMessages: FileMessage[] = [];
  templates: SmsTemplate[] = [];
  selectedTemplateId = '';
  selectedTemplate: SmsTemplate | null = null;
  templateVariables: string[] = [];
  templateVariableValues: Record<string, string> = {};
  sending = false;
  success = false;
  error = '';
  profile: SendProfile | null = null;
  sendResult: SmsSendResult | null = null;

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadProfileCredits(),
      this.loadTemplates()
    ]);
    await this.applyTemplateFromQueryParam();
  }

  get messageLength(): number {
    return this.getMessageToSend().length;
  }

  get smsCount(): number {
    return this.smsSegments(this.getMessageToSend());
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

  get requiredCredits(): number {
    if (this.mode === 'file') {
      return this.totalFileSms;
    }

    return this.smsCount;
  }

  get credits(): number {
    return Number(this.profile?.credits ?? 0);
  }

  get afterCredits(): number {
    return Math.max(0, this.credits - this.requiredCredits);
  }

  get previewMessages(): FileMessage[] {
    return this.fileMessages.slice(0, 10);
  }

  get isTemplateMode(): boolean {
    return !!this.selectedTemplate;
  }

  get templateBaseContent(): string {
    return this.selectedTemplate?.content ?? '';
  }

  get renderedFinalMessage(): string {
    return this.isTemplateMode
      ? this.renderTemplate(this.templateBaseContent, this.templateVariableValues)
      : this.manualMessage;
  }

  get hasTemplateVariables(): boolean {
    return this.templateVariables.length > 0;
  }

  get sendDisabledReason(): string | null {
    return this.getSendDisabledReason();
  }

  setMode(mode: SendMode): void {
    this.mode = mode;
    this.error = '';
    this.success = false;
    this.sendResult = null;
  }

  handleTemplateSelect(templateId: string): void {
    const template = this.templates.find((item) => item.id === templateId);

    if (template) {
      this.selectTemplate(template);
    } else {
      this.removeTemplate(false);
    }
  }

  removeTemplate(useRenderedMessage = true): void {
    const rendered = this.renderedFinalMessage.trim();
    this.selectedTemplateId = '';
    this.selectedTemplate = null;
    this.templateVariables = [];
    this.templateVariableValues = {};

    if (useRenderedMessage) {
      this.manualMessage = rendered;
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
      ['+51965432109', 'Estimado cliente, le recordamos su cita del día de mañana']
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

  async handleSend(): Promise<void> {
    this.error = '';
    this.success = false;
    this.sendResult = null;

    if (this.mode !== 'single') {
      this.error = 'Envío múltiple se implementará en siguiente fase';
      return;
    }

    const recipient = this.recipient.trim();
    const message = this.getMessageToSend();
    const disabledReason = this.getSendDisabledReason();

    if (disabledReason) {
      this.error = disabledReason;
      return;
    }

    this.sending = true;

    try {
      const result = await this.smsService.sendSingle({ recipient, message });
      this.sendResult = result;
      this.success = true;
      await this.loadProfileCredits();
    } catch (error) {
      this.error = error instanceof Error
        ? error.message
        : 'No se pudo enviar el SMS.';
    } finally {
      this.sending = false;
    }
  }

  smsSegments(value: string): number {
    return value.trim() ? this.smsService.calculateSegments(value) : 0;
  }

  renderTemplate(content: string, values: Record<string, string>): string {
    return this.smsService.renderTemplatePreview(content, values);
  }

  private validatePhone(phone: string): boolean {
    const cleanPhone = phone.trim();
    return /^\+51\d{9}$/.test(cleanPhone);
  }

  private getPhonesList(): string[] {
    if (this.mode === 'single') {
      const recipient = this.recipient.trim();
      return this.validatePhone(recipient) ? [recipient] : [];
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

  private async loadTemplates(): Promise<void> {
    try {
      this.templates = await this.smsService.listActiveTemplates();
    } catch {
      this.templates = [];
    }
  }

  private async applyTemplateFromQueryParam(): Promise<void> {
    const templateId = this.route.snapshot.queryParamMap.get('templateId');
    if (!templateId) return;

    let template = this.templates.find((item) => item.id === templateId) ?? null;

    if (!template) {
      try {
        template = await this.smsService.getTemplate(templateId);
      } catch {
        template = null;
      }
    }

    if (!template) {
      this.error = 'No se pudo cargar la plantilla seleccionada.';
      return;
    }

    this.mode = 'single';
    this.selectTemplate(template);
  }

  private selectTemplate(template: SmsTemplate): void {
    this.selectedTemplate = template;
    this.selectedTemplateId = template.id;
    this.templateVariables = template.variables.length > 0
      ? template.variables
      : this.smsService.extractTemplateVariables(template.content);

    const nextValues: Record<string, string> = {};
    for (const variable of this.templateVariables) {
      nextValues[variable] = this.templateVariableValues[variable] ?? '';
    }

    this.templateVariableValues = nextValues;
    this.error = '';
    this.success = false;
    this.sendResult = null;
  }

  getMissingTemplateVariables(): string[] {
    return this.templateVariables.filter((variable) => !this.templateVariableValues[variable]?.trim());
  }

  hasUnresolvedPlaceholders(message: string): boolean {
    return /\{[a-zA-Z0-9_-]+\}/.test(message);
  }

  getMessageToSend(): string {
    return this.renderedFinalMessage.trim();
  }

  getSendDisabledReason(): string | null {
    if (this.mode !== 'single') {
      return 'Envío múltiple se implementará en siguiente fase';
    }

    const recipient = this.recipient.trim();
    const message = this.getMessageToSend();

    if (!recipient || !this.validatePhone(recipient)) {
      return 'Ingresa un número válido.';
    }

    if (!message) {
      return 'El mensaje no puede estar vacío.';
    }

    const missingVariables = this.getMissingTemplateVariables();
    if (this.isTemplateMode && missingVariables.length > 0) {
      return `Completa las variables: ${missingVariables.join(', ')}.`;
    }

    if (this.hasUnresolvedPlaceholders(message)) {
      return 'Completa todas las variables de la plantilla.';
    }

    if (this.credits < this.requiredCredits) {
      return `Créditos insuficientes. Necesitas ${this.requiredCredits} créditos pero solo tienes ${this.credits.toFixed(0)}.`;
    }

    return null;
  }
}

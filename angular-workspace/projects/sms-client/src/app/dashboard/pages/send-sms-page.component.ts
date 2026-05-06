import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as XLSX from 'xlsx';
import { SmsFileRow, SmsMultipleSimpleResult, SmsSendResult, SmsService, SmsTemplate, SupabaseService } from '@sms-fortuna/shared';

type SendMode = 'single' | 'multiple' | 'file';

interface FileMessage {
  phone: string;
  message: string;
  sourceRow?: number;
}

interface SendProfile {
  id: string;
  credits: number | null;
}

interface ParsedRecipients {
  validRecipients: string[];
  invalidRecipients: string[];
  duplicatesRemoved: string[];
}

interface FileParseResult {
  messages: FileMessage[];
  invalidRecipients: string[];
  duplicatesRemoved: string[];
  rowsRead: number;
  error?: string;
}

@Component({
  selector: 'sms-send-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
  fileName = '';
  fileType = '';
  fileRowsRead = 0;
  fileRecipientsText = '';
  fileParseError = '';
  fileInvalidRecipients: string[] = [];
  fileDuplicatesRemoved: string[] = [];
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
  multipleResult: SmsMultipleSimpleResult | null = null;
  currentIdempotencyKey = '';

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
    if (this.mode === 'multiple') {
      return this.parsedMultipleRecipients.validRecipients.length;
    }

    if (this.mode === 'file') {
      return this.fileMessages.length;
    }

    return this.getPhonesList().length;
  }

  get totalFileSms(): number {
    return this.fileMessages.reduce((total, fileMessage) =>
      total + this.smsSegments(this.getFileMessageToSend(fileMessage)), 0
    );
  }

  get totalCost(): number {
    if (this.mode === 'file') {
      return this.totalFileSms * 0.08;
    }

    return this.phoneCount * this.smsCount * 0.08;
  }

  get requiredCredits(): number {
    if (this.mode === 'file') {
      return this.totalFileSms;
    }

    return this.phoneCount * this.smsCount;
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
    return this.manualMessage;
  }

  get hasTemplateVariables(): boolean {
    return this.templateVariables.length > 0;
  }

  get sendDisabledReason(): string | null {
    return this.getSendDisabledReason();
  }

  get parsedMultipleRecipients(): ParsedRecipients {
    return this.parseRecipients(this.multiplePhones);
  }

  get parsedFileRecipients(): ParsedRecipients {
    return this.parseRecipients(this.fileRecipientsText);
  }

  get fileEntryCount(): number {
    return this.fileRowsRead || this.fileMessages.length + this.fileInvalidRecipients.length + this.fileDuplicatesRemoved.length;
  }

  get fileUsesCustomMessages(): boolean {
    return this.fileMessages.some((fileMessage) => !!fileMessage.message.trim());
  }

  get fileMessageModeLabel(): string {
    return this.fileUsesCustomMessages
      ? 'Mensajes personalizados por fila'
      : 'Mensaje general aplicado a todos';
  }

  get multipleSuccessDetail(): string {
    if (!this.multipleResult) {
      return '';
    }

    const usedCredits = this.multipleResult.results
      .filter((result) => result.success)
      .reduce((total, result) => total + Number(result.segments ?? 0), 0);
    const cost = this.multipleResult.results
      .filter((result) => result.success)
      .reduce((total, result) => total + Number(result.cost ?? 0), 0);

    return `${this.multipleResult.sent} enviados · ${this.multipleResult.failed} fallidos · ${usedCredits} SMS descontados · S/ ${this.formatCurrency(cost)}`;
  }

  get successTitle(): string {
    return this.sendResult?.test_mode === false
      ? 'SMS enviado correctamente'
      : 'SMS enviado en modo test';
  }

  get successDetail(): string {
    if (this.sendResult?.test_mode !== false) {
      return 'Simulación interna. No enviado a proveedor real.';
    }

    const recipient = this.sendResult?.recipient || this.recipient.trim();
    return `${recipient} · ${this.successSmsLabel} · S/ ${this.successCostLabel} · estado ${this.successStatusLabel}`;
  }

  get successCreditsUsed(): number {
    return Number(this.sendResult?.segments ?? this.requiredCredits);
  }

  get successSmsLabel(): string {
    const count = this.successCreditsUsed;
    return count === 1 ? '1 SMS descontado' : `${count} SMS descontados`;
  }

  get successCostLabel(): string {
    return Number(this.sendResult?.cost ?? this.successCreditsUsed * 0.08).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  }

  get successStatusLabel(): string {
    switch (this.sendResult?.status) {
      case 'delivered':
        return 'entregado';
      case 'failed':
        return 'fallido';
      case 'pending':
        return 'pendiente';
      case 'sent':
      default:
        return 'enviado';
    }
  }

  setMode(mode: SendMode): void {
    this.mode = mode;
    this.error = '';
    this.success = false;
    this.sendResult = null;
    this.multipleResult = null;
  }

  handleTemplateSelect(templateId: string): void {
    const template = this.templates.find((item) => item.id === templateId);

    if (template) {
      this.selectTemplate(template);
    } else {
      this.removeTemplate(false);
    }
  }

  handleMessageChange(): void {
    if (this.isTemplateMode) {
      this.templateVariables = this.smsService.extractTemplateVariables(this.manualMessage);
    }
  }

  removeTemplate(useRenderedMessage = true): void {
    const rendered = this.manualMessage.trim();
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
    this.fileParseError = '';
    this.fileName = '';
    this.fileType = '';
    this.fileRowsRead = 0;
    this.fileRecipientsText = '';
    this.fileMessages = [];
    this.fileInvalidRecipients = [];
    this.fileDuplicatesRemoved = [];

    if (file.size > 500 * 1024) {
      this.error = 'El archivo excede el tamaño máximo de 500KB';
      input.value = '';
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    const isCsv = lowerName.endsWith('.csv');
    const isTxt = lowerName.endsWith('.txt');

    if (!isExcel && !isCsv && !isTxt) {
      this.fileParseError = 'Archivo no soportado. Usa Excel, CSV o TXT.';
      input.value = '';
      return;
    }

    if (isExcel) {
      this.readExcelFile(file);
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');

      if (!text.trim()) {
        this.fileParseError = 'Archivo vacío.';
        return;
      }

      this.fileName = file.name;
      this.fileType = isCsv ? 'CSV' : 'TXT';
      this.fileRecipientsText = text;
      const parsed = this.parseFileMessages(text);
      this.fileRowsRead = parsed.rowsRead;
      this.fileMessages = parsed.messages;
      this.fileInvalidRecipients = parsed.invalidRecipients;
      this.fileDuplicatesRemoved = parsed.duplicatesRemoved;

      if (this.fileMessages.length === 0) {
        this.fileParseError = 'No se encontraron números válidos.';
        return;
      }

      this.error = '';
    };
    reader.onerror = () => {
      this.fileParseError = 'Error al procesar el archivo';
    };
    reader.readAsText(file);
    input.value = '';
  }

  private readExcelFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          this.fileParseError = 'Archivo Excel vacío.';
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
          raw: false
        }) as unknown[][];

        if (rows.length === 0) {
          this.fileParseError = 'Archivo Excel vacío.';
          return;
        }

        const parsed = this.parseExcelRows(rows);

        if (parsed.error) {
          this.fileParseError = parsed.error;
          return;
        }

        this.fileName = file.name;
        this.fileType = 'Excel';
        this.fileRecipientsText = '';
        this.fileRowsRead = parsed.rowsRead;
        this.fileMessages = parsed.messages;
        this.fileInvalidRecipients = parsed.invalidRecipients;
        this.fileDuplicatesRemoved = parsed.duplicatesRemoved;

        if (this.fileMessages.length === 0) {
          this.fileParseError = 'No se encontraron números válidos.';
        }
      } catch {
        this.fileParseError = 'Error al procesar el archivo Excel.';
      }
    };
    reader.onerror = () => {
      this.fileParseError = 'Error al procesar el archivo Excel.';
    };
    reader.readAsArrayBuffer(file);
  }

  downloadTemplate(): void {
    const template = [
      ['Teléfono', 'Mensaje'],
      ['956062256', 'Hola Juan, este es un SMS de prueba personalizado.'],
      ['51956062256', 'Hola María, recuerda tu cita mañana.'],
      ['+51987654321', 'Hola Carlos, este mensaje viene desde archivo.']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(template);
    worksheet['!cols'] = [{ wch: 18 }, { wch: 64 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla SMS');
    XLSX.writeFile(workbook, 'plantilla_sms.xlsx');
  }

  clearFileMessages(): void {
    this.fileMessages = [];
    this.fileName = '';
    this.fileType = '';
    this.fileRowsRead = 0;
    this.fileRecipientsText = '';
    this.fileParseError = '';
    this.fileInvalidRecipients = [];
    this.fileDuplicatesRemoved = [];
  }

  async handleSend(): Promise<void> {
    if (this.sending) return;

    this.error = '';
    this.success = false;
    this.sendResult = null;
    this.multipleResult = null;

    const message = this.getMessageToSend();
    const disabledReason = this.getSendDisabledReason();

    if (disabledReason) {
      this.error = disabledReason;
      return;
    }

    if (this.mode === 'multiple') {
      await this.handleMultipleSend(message, this.parsedMultipleRecipients.validRecipients);
      return;
    }

    if (this.mode === 'file') {
      await this.handleFileSend();
      return;
    }

    const recipient = this.recipient.trim();
    this.currentIdempotencyKey = this.createIdempotencyKey();
    this.sending = true;

    try {
      const result = await this.smsService.sendSingle({
        recipient,
        message,
        idempotency_key: this.currentIdempotencyKey
      });
      this.sendResult = result;
      this.success = true;
      await this.loadProfileCredits();
    } catch (error) {
      this.error = error instanceof Error
        ? error.message
        : 'No se pudo enviar el SMS.';
    } finally {
      this.sending = false;
      this.currentIdempotencyKey = '';
    }
  }

  smsSegments(value: string): number {
    return value.trim() ? this.smsService.calculateSegments(value) : 0;
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'delivered':
        return 'entregado';
      case 'failed':
        return 'fallido';
      case 'pending':
        return 'pendiente';
      case 'sent':
        return 'enviado';
      default:
        return 'procesado';
    }
  }

  renderTemplate(content: string, values: Record<string, string>): string {
    return this.smsService.renderTemplatePreview(content, values);
  }

  getFileMessageToSend(fileMessage: FileMessage): string {
    return (fileMessage.message || this.manualMessage).trim();
  }

  private validatePhone(phone: string): boolean {
    return /^\+519\d{8}$/.test(phone.trim());
  }

  private normalizePhone(phone: string): string | null {
    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');

    if (/^9\d{8}$/.test(cleanPhone)) {
      return `+51${cleanPhone}`;
    }

    if (/^519\d{8}$/.test(cleanPhone)) {
      return `+${cleanPhone}`;
    }

    if (/^\+519\d{8}$/.test(cleanPhone)) {
      return cleanPhone;
    }

    return null;
  }

  private parseRecipients(input: string): ParsedRecipients {
    const tokens = this.getRecipientTokens(input);
    const seen = new Set<string>();
    const validRecipients: string[] = [];
    const invalidRecipients: string[] = [];
    const duplicatesRemoved: string[] = [];

    for (const token of tokens) {
      const normalized = this.normalizePhone(token);

      if (!normalized || !this.validatePhone(normalized)) {
        invalidRecipients.push(token);
        continue;
      }

      if (seen.has(normalized)) {
        duplicatesRemoved.push(normalized);
        continue;
      }

      seen.add(normalized);
      validRecipients.push(normalized);
    }

    return { validRecipients, invalidRecipients, duplicatesRemoved };
  }

  private parseFileMessages(input: string): FileParseResult {
    const rows = input
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);
    const messages: FileMessage[] = [];
    const invalidRecipients: string[] = [];
    const duplicatesRemoved: string[] = [];
    const seen = new Set<string>();
    let phoneIndex = 0;
    let messageIndex = 1;
    let hasHeader = false;

    for (const [index, row] of rows.entries()) {
      const cells = this.parseFileRow(row);

      if (index === 0 && this.isFileHeader(cells)) {
        hasHeader = true;
        phoneIndex = this.findHeaderIndex(cells, this.phoneHeaderNames(), 0);
        messageIndex = this.findHeaderIndex(cells, this.messageHeaderNames(), 1);
        continue;
      }

      if (!hasHeader && cells.length >= 2 && this.looksLikePhone(cells[1])) {
        for (const cell of cells) {
          this.addParsedFileMessage(cell, '', index + 1, messages, invalidRecipients, duplicatesRemoved, seen);
        }
        continue;
      }

      if (hasHeader || cells.length >= 2) {
        const phoneValue = String(cells[phoneIndex] ?? '').trim();
        const messageValue = String(cells[messageIndex] ?? cells.slice(1).join(', ') ?? '').trim();
        this.addParsedFileMessage(phoneValue, messageValue, index + 1, messages, invalidRecipients, duplicatesRemoved, seen);
        continue;
      }

      for (const token of this.getRecipientTokens(row)) {
        this.addParsedFileMessage(token, '', index + 1, messages, invalidRecipients, duplicatesRemoved, seen);
      }
    }

    return { messages, invalidRecipients, duplicatesRemoved, rowsRead: rows.length - (hasHeader ? 1 : 0) };
  }

  private parseExcelRows(rows: unknown[][]): FileParseResult {
    const nonEmptyRows = rows
      .map((row) => row.map((cell) => String(cell ?? '').trim()))
      .filter((row) => row.some(Boolean));

    if (nonEmptyRows.length === 0) {
      return this.emptyFileParseResult('Archivo Excel vacío.');
    }

    const header = nonEmptyRows[0];
    const phoneIndex = this.findHeaderIndex(header, this.phoneHeaderNames(), -1);
    const messageIndex = this.findHeaderIndex(header, this.messageHeaderNames(), -1);

    if (phoneIndex < 0) {
      return this.emptyFileParseResult('No se encontró una columna de teléfono. Usa una columna llamada telefono o celular.');
    }

    const messages: FileMessage[] = [];
    const invalidRecipients: string[] = [];
    const duplicatesRemoved: string[] = [];
    const seen = new Set<string>();

    for (let rowIndex = 1; rowIndex < nonEmptyRows.length; rowIndex++) {
      const row = nonEmptyRows[rowIndex];
      const phoneValue = String(row[phoneIndex] ?? '').trim();
      const messageValue = messageIndex >= 0 ? String(row[messageIndex] ?? '').trim() : '';

      if (!phoneValue && !messageValue) {
        continue;
      }

      this.addParsedFileMessage(phoneValue, messageValue, rowIndex + 1, messages, invalidRecipients, duplicatesRemoved, seen);
    }

    return {
      messages,
      invalidRecipients,
      duplicatesRemoved,
      rowsRead: Math.max(0, nonEmptyRows.length - 1)
    };
  }

  private emptyFileParseResult(error: string): FileParseResult {
    return {
      messages: [],
      invalidRecipients: [],
      duplicatesRemoved: [],
      rowsRead: 0,
      error
    };
  }

  private addParsedFileMessage(
    phone: string,
    message: string,
    sourceRow: number,
    messages: FileMessage[],
    invalidRecipients: string[],
    duplicatesRemoved: string[],
    seen: Set<string>
  ): void {
    const normalized = this.normalizePhone(phone);

    if (!normalized || !this.validatePhone(normalized)) {
      invalidRecipients.push(phone || '(vacío)');
      return;
    }

    if (seen.has(normalized)) {
      duplicatesRemoved.push(normalized);
      return;
    }

    seen.add(normalized);
    messages.push({ phone: normalized, message, sourceRow });
  }

  private parseFileRow(row: string): string[] {
    const delimiter = row.includes('\t')
      ? '\t'
      : row.includes(';')
        ? ';'
        : row.includes(',')
          ? ','
          : null;

    if (!delimiter) {
      return [row.trim()];
    }

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < row.length; index++) {
      const char = row[index];
      const next = row[index + 1];

      if (char === '"' && next === '"') {
        current += '"';
        index++;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }

  private isFileHeader(cells: string[]): boolean {
    const headerNames = [...this.phoneHeaderNames(), ...this.messageHeaderNames()];
    return cells.some((cell) => headerNames.includes(this.normalizeHeader(cell)));
  }

  private findHeaderIndex(cells: string[], names: string[], fallback: number): number {
    const found = cells.findIndex((cell) => names.includes(this.normalizeHeader(cell)));
    return found >= 0 ? found : fallback;
  }

  private normalizeHeader(header: string): string {
    return header
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private phoneHeaderNames(): string[] {
    return ['telefono', 'phone', 'celular', 'numero', 'nro', 'mobile'];
  }

  private messageHeaderNames(): string[] {
    return ['mensaje', 'message', 'texto', 'contenido', 'sms'];
  }

  private looksLikePhone(value: string): boolean {
    const normalized = this.normalizePhone(value);
    return !!normalized && this.validatePhone(normalized);
  }

  private getRecipientTokens(input: string): string[] {
    return input
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => ![...this.phoneHeaderNames(), ...this.messageHeaderNames()].includes(this.normalizeHeader(item)));
  }

  private createIdempotencyKey(): string {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    const values = new Uint32Array(4);
    globalThis.crypto?.getRandomValues(values);
    const randomPart = Array.from(values, (value) => value.toString(36)).join('');
    return `sms_${Date.now().toString(36)}_${randomPart}`;
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

  private async handleMultipleSend(message: string, recipients: string[]): Promise<void> {
    this.sending = true;

    try {
      const result = await this.smsService.sendMultipleSimple({
        recipients,
        message
      });
      this.multipleResult = result;
      this.success = true;
      await this.loadProfileCredits();
    } catch (error) {
      this.error = error instanceof Error
        ? error.message
        : 'No se pudo completar el envío múltiple.';
    } finally {
      this.sending = false;
    }
  }

  private async handleFileSend(): Promise<void> {
    this.sending = true;

    try {
      const rows: SmsFileRow[] = this.fileMessages.map((fileMessage) => ({
        recipient: fileMessage.phone,
        message: this.getFileMessageToSend(fileMessage),
        sourceRow: fileMessage.sourceRow
      }));

      this.multipleResult = await this.smsService.sendFileRowsSimple(rows);
      this.success = true;
      await this.loadProfileCredits();
    } catch (error) {
      this.error = error instanceof Error
        ? error.message
        : 'No se pudo completar el envío desde fichero.';
    } finally {
      this.sending = false;
    }
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
    this.manualMessage = template.content;
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
    return [];
  }

  hasUnresolvedPlaceholders(message: string): boolean {
    return /\{[a-zA-Z0-9_-]+\}/.test(message);
  }

  getMessageToSend(): string {
    return this.manualMessage.trim();
  }

  getSendDisabledReason(): string | null {
    const message = this.getMessageToSend();

    if (this.mode === 'single' && (!this.recipient.trim() || !this.validatePhone(this.recipient))) {
      return 'Ingresa un número válido.';
    }

    if (this.mode === 'multiple' && this.parsedMultipleRecipients.validRecipients.length === 0) {
      return 'Ingresa al menos un número válido.';
    }

    if (this.mode === 'file') {
      if (this.fileParseError) {
        return this.fileParseError;
      }

      if (!this.fileName) {
        return 'Carga un archivo Excel, CSV o TXT.';
      }

      if (this.fileMessages.length === 0) {
        return 'No se encontraron números válidos.';
      }

      if (this.fileMessages.some((fileMessage) => !this.getFileMessageToSend(fileMessage))) {
        return 'Cada fila debe tener mensaje o escribe un mensaje general.';
      }
    }

    if (this.mode !== 'file' && !message) {
      return 'El mensaje no puede estar vacío.';
    }

    if (this.credits < this.requiredCredits) {
      return `Créditos insuficientes. Necesitas ${this.requiredCredits} créditos pero solo tienes ${this.credits.toFixed(0)}.`;
    }

    return null;
  }
}

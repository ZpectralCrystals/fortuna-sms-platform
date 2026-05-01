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
  templateUrl: './send-sms-page.component.html',
  styleUrl: './send-sms-page.component.scss'
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

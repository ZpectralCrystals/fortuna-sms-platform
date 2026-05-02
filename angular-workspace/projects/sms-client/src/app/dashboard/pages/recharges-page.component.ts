import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Recharge, RechargesService, SmsPackage, SupabaseService } from '@sms-fortuna/shared';

const WHATSAPP_NUMBER = '51982165728';
const QR_ASSET = 'assets/whatsapp_image_2026-02-01_at_10.23.01_am.jpeg';

interface PaymentMethod {
  id: 'yape' | 'plin' | 'transferencia';
  name: string;
  icon: string;
}

interface ProfileBalance {
  credits: number;
  total_spent: number;
}

@Component({
  selector: 'sms-recharges-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recharges-page.component.html',
  styleUrl: './recharges-page.component.scss'
})
export class RechargesPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly rechargesService = inject(RechargesService);

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

  rechargePackages: SmsPackage[] = [];
  recharges: Recharge[] = [];
  showModal = false;
  selectedPackage: SmsPackage | null = null;
  selectedMethod: PaymentMethod['id'] | '' = '';
  operationCode = '';
  copiedText = '';
  noticeMessage = '';
  requestMessage = '';
  loadingPackages = true;
  loadingRecharges = true;
  submitting = false;

  ngOnInit(): void {
    void this.loadData();
  }

  selectPackage(pkg: SmsPackage): void {
    this.selectedPackage = pkg;
    this.selectedMethod = '';
    this.operationCode = '';
    this.requestMessage = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPackage = null;
    this.selectedMethod = '';
    this.operationCode = '';
    this.requestMessage = '';
  }

  calculateTotal(pkg: SmsPackage | null): number {
    return Number(pkg?.total_price ?? 0);
  }

  calculateSubtotal(pkg: SmsPackage | null): number {
    return Number(pkg?.base_price ?? 0);
  }

  calculateIGV(pkg: SmsPackage | null): number {
    return this.calculateTotal(pkg) - this.calculateSubtotal(pkg);
  }

  async submitRechargeRequest(): Promise<void> {
    this.requestMessage = '';
    this.noticeMessage = '';

    if (!this.selectedPackage) {
      this.requestMessage = 'Selecciona un paquete para enviar la solicitud.';
      return;
    }

    if (!this.selectedMethod) {
      this.requestMessage = 'Selecciona un método de pago para enviar la solicitud.';
      return;
    }

    try {
      this.submitting = true;

      await this.rechargesService.createRecharge({
        package_id: this.selectedPackage.id,
        sms_credits: this.selectedPackage.sms_credits,
        amount: this.selectedPackage.total_price,
        payment_method: this.selectedMethod,
        operation_code: this.operationCode
      });

      this.noticeMessage = 'Solicitud enviada. Quedará pendiente de aprobación por backoffice.';
      this.closeModal();
      await this.loadRecharges();
    } catch (error) {
      this.requestMessage = error instanceof Error
        ? error.message
        : 'No se pudo crear la solicitud de recarga.';
    } finally {
      this.submitting = false;
    }
  }

  openWhatsApp(): void {
    const amount = this.selectedPackage?.total_price ?? 0;
    const sms = this.selectedPackage?.sms_credits ?? 0;
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
    if (status === 'approved') return 'status-icon status-icon--completed';
    if (status === 'rejected') return 'status-icon status-icon--failed';
    return 'status-icon status-icon--pending';
  }

  statusTextClass(status: string): string {
    if (status === 'approved') return 'status-text--completed';
    if (status === 'rejected') return 'status-text--failed';
    return 'status-text--pending';
  }

  statusLabel(status: string): string {
    if (status === 'approved') return 'Aprobado';
    if (status === 'rejected') return 'Rechazado';
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
        this.rechargePackages = [];
        this.loadingPackages = false;
        this.loadingRecharges = false;
        this.noticeMessage = 'No hay sesión activa. Inicia sesión para ver tus recargas.';
        return;
      }

      await Promise.all([
        this.loadProfile(userId),
        this.loadPackages(),
        this.loadRecharges()
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

  private async loadPackages(): Promise<void> {
    try {
      this.loadingPackages = true;
      this.rechargePackages = await this.rechargesService.listActivePackages();
    } catch (error) {
      this.noticeMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar los paquetes activos.';
      this.rechargePackages = [];
    } finally {
      this.loadingPackages = false;
    }
  }

  private async loadRecharges(): Promise<void> {
    try {
      this.loadingRecharges = true;
      this.recharges = await this.rechargesService.listMyRecharges();
    } catch (error) {
      this.noticeMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar tu historial de recargas.';
      this.recharges = [];
    } finally {
      this.loadingRecharges = false;
    }
  }
}

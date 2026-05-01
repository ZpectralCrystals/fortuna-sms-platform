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
  templateUrl: './recharges-page.component.html',
  styleUrl: './recharges-page.component.scss'
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

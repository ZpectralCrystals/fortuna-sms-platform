import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AdminRecharge,
  ManualRechargeClient,
  PaymentMethod,
  RechargeStatus,
  RechargesService,
  SmsPackage
} from '@sms-fortuna/shared';

type RechargeFilter = 'all' | RechargeStatus;
type ManualPaymentMethod = Extract<PaymentMethod, string>;

@Component({
  selector: 'bo-recharges-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recharges-page.component.html',
  styleUrl: './recharges-page.component.scss'
})
export class RechargesPageComponent implements OnInit {
  private readonly rechargesService = inject(RechargesService);

  recharges: AdminRecharge[] = [];
  packages: SmsPackage[] = [];
  clients: ManualRechargeClient[] = [];
  loading = true;
  submitting = false;
  filter: RechargeFilter = 'pending';
  showCreateModal = false;
  showApprovalModal = false;
  showRejectModal = false;
  selectedRecharge: AdminRecharge | null = null;
  operationCode = '';
  rejectionReason = '';
  approvalError = '';
  rejectError = '';
  createError = '';
  message = '';
  newRecharge = {
    user_id: '',
    package_id: '',
    payment_method: 'yape' as ManualPaymentMethod,
    operation_code: '',
    notes: ''
  };
  readonly paymentMethods: Array<{ value: ManualPaymentMethod; label: string }> = [
    { value: 'yape', label: 'Yape' },
    { value: 'plin', label: 'Plin' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'otro', label: 'Otro' }
  ];
  readonly filterOptions: Array<{ value: RechargeFilter; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobadas' },
    { value: 'rejected', label: 'Rechazadas' }
  ];

  get filteredRecharges(): AdminRecharge[] {
    if (this.filter === 'all') {
      return this.recharges;
    }

    return this.recharges.filter((recharge) => recharge.status === this.filter);
  }

  get selectedPackage(): SmsPackage | null {
    return this.packages.find((pkg) => pkg.id === this.newRecharge.package_id) ?? null;
  }

  get manualRechargeSmsAmount(): number | null {
    return this.selectedPackage?.sms_credits ?? null;
  }

  get manualRechargeAmount(): number | null {
    return this.selectedPackage?.total_price ?? null;
  }

  get canCreateRecharge(): boolean {
    return Boolean(
      !this.submitting &&
      this.newRecharge.user_id &&
      this.newRecharge.package_id &&
      this.newRecharge.payment_method &&
      this.newRecharge.operation_code.trim()
    );
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadRecharges(),
      this.loadPackages(),
      this.loadClients()
    ]);
    this.loading = false;
  }

  async loadPackages(): Promise<void> {
    try {
      this.packages = await this.rechargesService.listActivePackages();
    } catch (error) {
      this.message = error instanceof Error
        ? error.message
        : 'No se pudieron cargar los paquetes activos.';
      this.packages = [];
    }
  }

  async loadRecharges(): Promise<void> {
    try {
      this.recharges = await this.rechargesService.listAdminRecharges();
    } catch (error) {
      this.message = error instanceof Error
        ? error.message
        : 'No se pudieron cargar las recargas.';
      this.recharges = [];
    }
  }

  async loadClients(): Promise<void> {
    try {
      this.clients = await this.rechargesService.listManualRechargeClients();
    } catch (error) {
      this.message = error instanceof Error
        ? error.message
        : 'No se pudieron cargar los clientes.';
      this.clients = [];
    }
  }

  openCreateModal(): void {
    this.message = '';
    this.createError = '';
    this.resetNewRecharge();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  async handleCreateRecharge(): Promise<void> {
    this.createError = '';

    const operationCode = this.newRecharge.operation_code.trim();

    if (!this.newRecharge.user_id) {
      this.createError = 'Selecciona un cliente.';
      return;
    }

    if (!this.newRecharge.package_id) {
      this.createError = 'Selecciona un paquete.';
      return;
    }

    if (!this.newRecharge.payment_method) {
      this.createError = 'Selecciona un método de pago.';
      return;
    }

    if (!operationCode) {
      this.createError = 'Ingresa el código de operación.';
      return;
    }

    this.submitting = true;

    try {
      const result = await this.rechargesService.createManualRecharge({
        user_id: this.newRecharge.user_id,
        package_id: this.newRecharge.package_id,
        payment_method: this.newRecharge.payment_method,
        operation_code: operationCode,
        notes: this.newRecharge.notes
      });

      this.message = `Recarga creada correctamente: ${this.formatNumber(result.sms_credits)} SMS por S/ ${this.formatCurrency(result.amount)}. Saldo actualizado: ${this.formatNumber(result.new_balance)} SMS.`;
      this.filter = 'approved';
      this.closeCreateModal();
      await Promise.all([
        this.loadRecharges(),
        this.loadClients()
      ]);
    } catch (error) {
      this.createError = error instanceof Error
        ? error.message
        : 'No se pudo crear la recarga.';
    } finally {
      this.submitting = false;
    }
  }

  onPackageChange(packageId: string): void {
    if (!packageId) {
      this.newRecharge.package_id = '';
    }
  }

  openApprovalModal(recharge: AdminRecharge): void {
    this.message = '';
    this.approvalError = '';
    this.selectedRecharge = recharge;
    this.operationCode = recharge.operation_code ?? '';
    this.showApprovalModal = true;
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedRecharge = null;
    this.operationCode = '';
    this.approvalError = '';
  }

  openRejectModal(recharge: AdminRecharge): void {
    this.message = '';
    this.rejectError = '';
    this.selectedRecharge = recharge;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedRecharge = null;
    this.rejectionReason = '';
    this.rejectError = '';
  }

  async handleApprove(): Promise<void> {
    this.approvalError = '';

    if (!this.selectedRecharge) {
      this.approvalError = 'Selecciona una recarga para aprobar.';
      return;
    }

    if (this.selectedRecharge.status !== 'pending') {
      this.approvalError = 'Esta recarga ya fue procesada.';
      return;
    }

    const operationCode = this.operationCode.trim() || this.selectedRecharge.operation_code || '';

    if (!operationCode) {
      this.approvalError = 'El código de operación es requerido para aprobar.';
      return;
    }

    this.submitting = true;

    try {
      await this.rechargesService.approveRecharge(this.selectedRecharge.id, operationCode);
      this.message = 'Recarga aprobada correctamente.';
      this.closeApprovalModal();
      await this.loadRecharges();
    } catch (error) {
      this.approvalError = error instanceof Error
        ? error.message
        : 'No se pudo aprobar la recarga.';
    } finally {
      this.submitting = false;
    }
  }

  async handleReject(): Promise<void> {
    this.rejectError = '';

    if (!this.selectedRecharge) {
      this.rejectError = 'Selecciona una recarga para rechazar.';
      return;
    }

    if (this.selectedRecharge.status !== 'pending') {
      this.rejectError = 'Esta recarga ya fue procesada.';
      return;
    }

    if (!this.rejectionReason.trim()) {
      this.rejectError = 'Ingresa un motivo de rechazo.';
      return;
    }

    this.submitting = true;

    try {
      await this.rechargesService.rejectRecharge(this.selectedRecharge.id, this.rejectionReason);
      this.message = 'Recarga rechazada correctamente.';
      this.closeRejectModal();
      await this.loadRecharges();
    } catch (error) {
      this.rejectError = error instanceof Error
        ? error.message
        : 'No se pudo rechazar la recarga.';
    } finally {
      this.submitting = false;
    }
  }

  statusLabel(status: RechargeStatus): string {
    const labels: Record<RechargeStatus, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    };

    return labels[status];
  }

  clientName(recharge: AdminRecharge): string {
    return recharge.profile?.full_name?.trim()
      || recharge.profile?.email?.trim()
      || 'Cliente sin nombre';
  }

  clientEmail(recharge: AdminRecharge): string {
    return recharge.profile?.email?.trim() || '-';
  }

  clientCompany(recharge: AdminRecharge): string | null {
    return recharge.profile?.razon_social?.trim()
      || recharge.profile?.ruc?.trim()
      || null;
  }

  clientOptionLabel(client: ManualRechargeClient): string {
    const name = client.full_name?.trim() || client.razon_social?.trim() || client.email;
    const company = client.razon_social?.trim();

    return company && company !== name
      ? `${name} - ${company}`
      : name;
  }

  private resetNewRecharge(): void {
    this.newRecharge = {
      user_id: '',
      package_id: '',
      payment_method: 'yape',
      operation_code: '',
      notes: ''
    };
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}

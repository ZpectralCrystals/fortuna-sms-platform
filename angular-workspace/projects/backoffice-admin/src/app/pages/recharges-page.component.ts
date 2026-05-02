import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminRecharge, RechargeStatus, RechargesService, SmsPackage } from '@sms-fortuna/shared';

type RechargeFilter = 'all' | RechargeStatus;

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
  message = '';
  newRecharge = {
    user_id: '',
    package_id: '',
    payment_method: 'yape'
  };
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

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadRecharges(),
      this.loadPackages()
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

  openCreateModal(): void {
    this.message = 'La creación manual desde backoffice se implementará en FASE 3 con RPC atómica.';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  handleCreateRecharge(): void {
    this.submitting = true;
    this.message = 'La creación manual desde backoffice se implementará en FASE 3 con RPC atómica.';
    this.submitting = false;
    this.showCreateModal = false;
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

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from '../../../../shared/src/lib/services/supabase.service';

type RechargeStatus = 'pending' | 'approved' | 'rejected';
type RechargeFilter = 'all' | RechargeStatus;

interface RechargeWithDetails {
  id: string;
  user_id: string;
  package_id: string;
  quantity: number;
  amount: number;
  payment_method: string;
  status: RechargeStatus;
  created_at: string;
  operation_code: string | null;
  user: {
    full_name: string;
    email: string;
    company: string | null;
  };
  package: {
    name: string;
  };
}

interface RechargeUser {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
}

interface SmsPackage {
  id: string;
  name: string;
  quantity: number;
  total_price: number;
}

@Component({
  selector: 'bo-recharges-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recharges-page.component.html',
  styleUrl: './recharges-page.component.scss'
})
export class RechargesPageComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  recharges: RechargeWithDetails[] = [];
  users: RechargeUser[] = [];
  packages: SmsPackage[] = [];
  loading = true;
  submitting = false;
  filter: RechargeFilter = 'pending';
  inventoryAvailable = 0;
  showCreateModal = false;
  showApprovalModal = false;
  selectedRecharge: RechargeWithDetails | null = null;
  operationCode = '';
  approvalError = '';
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

  get filteredRecharges(): RechargeWithDetails[] {
    if (this.filter === 'all') {
      return this.recharges;
    }

    return this.recharges.filter((recharge) => recharge.status === this.filter);
  }

  get inventoryTone(): 'danger' | 'warning' | 'safe' {
    if (this.inventoryAvailable < 1000) {
      return 'danger';
    }

    if (this.inventoryAvailable < 10000) {
      return 'warning';
    }

    return 'safe';
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadRecharges(),
      this.loadInventory(),
      this.loadUsers(),
      this.loadPackages()
    ]);
    this.loading = false;
  }

  async loadUsers(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('users')
        .select('id, email, full_name, company')
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        throw error;
      }

      this.users = (data ?? []).map((user: any) => ({
        id: String(user.id ?? ''),
        email: String(user.email ?? ''),
        full_name: String(user.full_name ?? ''),
        company: typeof user.company === 'string' ? user.company : null
      }));
    } catch (error) {
      console.warn('Error loading recharge users:', error);
      this.users = [];
    }
  }

  async loadPackages(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('sms_packages')
        .select('id, name, quantity, total_price')
        .eq('is_active', true)
        .order('quantity');

      if (error) {
        throw error;
      }

      this.packages = (data ?? []).map((packageOption: any) => ({
        id: String(packageOption.id ?? ''),
        name: String(packageOption.name ?? ''),
        quantity: Number(packageOption.quantity ?? 0),
        total_price: Number(packageOption.total_price ?? 0)
      }));
    } catch (error) {
      console.warn('Error loading sms packages:', error);
      this.packages = [];
    }
  }

  async loadInventory(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('sms_inventory')
        .select('available_sms')
        .single();

      if (error) {
        throw error;
      }

      this.inventoryAvailable = Number(data?.available_sms ?? 0);
    } catch (error) {
      console.warn('Error loading sms inventory:', error);
      this.inventoryAvailable = 0;
    }
  }

  async loadRecharges(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('recharges')
        .select(`
          *,
          user:users(full_name, email, company),
          package:sms_packages(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.recharges = (data ?? []).map((recharge: any) => ({
        id: String(recharge.id ?? ''),
        user_id: String(recharge.user_id ?? ''),
        package_id: String(recharge.package_id ?? ''),
        quantity: Number(recharge.quantity ?? 0),
        amount: Number(recharge.amount ?? 0),
        payment_method: String(recharge.payment_method ?? ''),
        status: this.toStatus(recharge.status),
        created_at: String(recharge.created_at ?? new Date().toISOString()),
        operation_code: typeof recharge.operation_code === 'string' ? recharge.operation_code : null,
        user: {
          full_name: String(recharge.user?.full_name ?? ''),
          email: String(recharge.user?.email ?? ''),
          company: typeof recharge.user?.company === 'string' ? recharge.user.company : null
        },
        package: {
          name: String(recharge.package?.name ?? '')
        }
      }));
    } catch (error) {
      console.warn('Error loading recharges:', error);
      this.recharges = [];
    }
  }

  openCreateModal(): void {
    this.message = '';
    this.newRecharge = {
      user_id: '',
      package_id: '',
      payment_method: 'yape'
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  handleCreateRecharge(): void {
    this.submitting = true;
    this.message = 'La creación segura de recargas se conectará en la siguiente fase.';
    this.submitting = false;
    this.showCreateModal = false;
  }

  openApprovalModal(recharge: RechargeWithDetails): void {
    this.message = '';
    this.approvalError = '';
    this.selectedRecharge = recharge;
    this.operationCode = '';
    this.showApprovalModal = true;
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedRecharge = null;
    this.operationCode = '';
    this.approvalError = '';
  }

  handleApprove(): void {
    if (!this.operationCode.trim()) {
      this.approvalError = 'El código de operación bancaria es requerido';
      return;
    }

    this.approvalError = '';
    this.submitting = true;
    this.message = 'La aprobación segura de recargas se conectará en la siguiente fase.';
    this.submitting = false;
    this.closeApprovalModal();
  }

  handleReject(): void {
    this.message = 'El rechazo seguro de recargas se conectará en la siguiente fase.';
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

  private toStatus(value: unknown): RechargeStatus {
    return value === 'approved' || value === 'rejected' || value === 'pending'
      ? value
      : 'pending';
  }
}

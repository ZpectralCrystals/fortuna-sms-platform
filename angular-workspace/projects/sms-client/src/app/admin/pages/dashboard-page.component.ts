import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  BackofficeService,
  InventoryPurchaseRecord
} from '@sms-fortuna/shared';
import { environment } from '../../../environments/environment';

const WHOLESALE_SMS_COST = 0.04012;
const SHOW_SMS_PURCHASE_CONTROLS = true;

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingRecharges: number;
  totalSmsBalance: number;
  inventoryAvailable: number;
  inventorySold: number;
  revenueSmsSold: number;
  inventoryTotal: number;
  totalMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  pendingMessages: number;
  totalRevenue: number;
}

@Component({
    selector: 'bo-dashboard-page',
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard-page.component.html',
    styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  stats: DashboardStats = {
    totalUsers: 0,
    activeUsers: 0,
    pendingRecharges: 0,
    totalSmsBalance: 0,
    inventoryAvailable: 0,
    inventorySold: 0,
    revenueSmsSold: 0,
    inventoryTotal: 0,
    totalMessages: 0,
    sentMessages: 0,
    deliveredMessages: 0,
    failedMessages: 0,
    pendingMessages: 0,
    totalRevenue: 0
  };

  loading = true;
  submitting = false;
  syncingProviderBalance = false;
  showPurchaseModal = false;
  showPurchaseHistory = false;
  readonly showSmsPurchaseControls = SHOW_SMS_PURCHASE_CONTROLS;
  purchases: InventoryPurchaseRecord[] = [];
  providerBalance: number | null = null;
  providerBalanceProvider = '';
  providerBalanceCheckedAt = '';
  errorMessage = '';
  successMessage = '';
  purchaseForm = {
    quantity: '',
    amount: '',
    operationNumber: '',
    notes: ''
  };

  get inventoryAvailableSms(): number {
    return this.safeMetric(this.stats.inventoryAvailable);
  }

  get inventoryTotalSms(): number {
    return this.safeMetric(this.stats.inventoryTotal);
  }

  get totalRevenue(): number {
    return this.safeMetric(this.stats.totalRevenue);
  }

  get approvedSmsSold(): number {
    return this.safeMetric(this.stats.revenueSmsSold);
  }

  get pendingRecharges(): number {
    return this.safeMetric(this.stats.pendingRecharges);
  }

  get totalUsers(): number {
    return this.safeMetric(this.stats.totalUsers);
  }

  get activeUsers(): number {
    return this.safeMetric(this.stats.activeUsers);
  }

  get inventorySoldPercentage(): string {
    return this.stats.inventoryTotal > 0
      ? `${((this.stats.inventorySold / this.stats.inventoryTotal) * 100).toFixed(1)}%`
      : '0%';
  }

  get activeUsersRate(): string {
    return this.stats.totalUsers > 0
      ? `${((this.stats.activeUsers / this.stats.totalUsers) * 100).toFixed(1)}%`
      : '0%';
  }

  get averageSmsPerUser(): string {
    return this.stats.activeUsers > 0
      ? this.formatNumber(Math.round(this.stats.totalSmsBalance / this.stats.activeUsers))
      : '0';
  }

  get deliveryRate(): string {
    return this.stats.totalMessages > 0
      ? `${((this.acceptedMessages / this.stats.totalMessages) * 100).toFixed(1)}%`
      : '0%';
  }

  get acceptedMessages(): number {
    return this.stats.sentMessages + this.stats.deliveredMessages;
  }

  get totalPurchasedSms(): number {
    return this.purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
  }

  get totalPurchasedAmount(): number {
    return this.purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  }

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
    this.loading = false;
  }

  async loadDashboard(): Promise<void> {
    await Promise.all([this.loadStats(), this.loadPurchases()]);
    await this.loadInventory();
  }

  async loadStats(): Promise<void> {
    try {
      const data = await this.backofficeService.getDashboardStats();
      if (!data) {
        return;
      }

      const statsData = data as any;

      this.stats = {
        totalUsers: Number(statsData.users?.total_users ?? 0),
        activeUsers: Number(statsData.users?.active_users ?? 0),
        pendingRecharges: Number(statsData.recharges?.pending_recharges ?? 0),
        totalSmsBalance: Number(statsData.users?.total_sms_balance ?? 0),
        inventoryAvailable: Number(statsData.inventory?.available_sms ?? 0),
        inventorySold: Number(statsData.inventory?.sold_sms ?? 0),
        revenueSmsSold: Number(statsData.recharges?.approved_sms_sold ?? 0),
        inventoryTotal: Number(statsData.inventory?.total_sms ?? 0),
        totalMessages: Number(statsData.messages?.total_messages ?? 0),
        sentMessages: Number(statsData.messages?.sent_messages ?? 0),
        deliveredMessages: Number(statsData.messages?.delivered_messages ?? 0),
        failedMessages: Number(statsData.messages?.failed_messages ?? 0),
        pendingMessages: Number(statsData.messages?.pending_messages ?? 0),
        totalRevenue: Number.parseFloat(String(statsData.recharges?.total_revenue ?? 0))
      };

      this.debugDashboard('dashboard stats loaded');
    } catch (error) {
      console.warn('No se pudieron cargar las estadísticas del dashboard admin.', error);
    }
  }

  async loadInventory(): Promise<void> {
    try {
      const inventory = await this.backofficeService.getInventoryState();
      this.stats = {
        ...this.stats,
        inventoryAvailable: inventory.available_sms,
        inventorySold: inventory.sold_sms,
        inventoryTotal: inventory.total_sms
      };

      this.debugDashboard('inventory loaded');
    } catch (error) {
      console.warn('No se pudo cargar el inventario local SMS.', error);
    }
  }

  async loadPurchases(): Promise<void> {
    try {
      this.purchases = await this.backofficeService.listInventoryPurchases();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar el historial de compras.';
      this.purchases = [];
    }
  }

  openPurchaseModal(): void {
    if (!this.showSmsPurchaseControls) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.showPurchaseModal = true;
  }

  closePurchaseModal(): void {
    this.showPurchaseModal = false;
  }

  onAmountChange(amount: string): void {
    const numericAmount = Number.parseFloat(amount);
    this.purchaseForm.quantity = Number.isFinite(numericAmount) && numericAmount > 0
      ? Math.floor(numericAmount / WHOLESALE_SMS_COST).toString()
      : '';
  }

  async handlePurchase(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    const quantity = Number.parseInt(this.purchaseForm.quantity, 10);
    const amount = Number.parseFloat(this.purchaseForm.amount);

    if (!Number.isFinite(quantity) || quantity < 1) {
      this.errorMessage = 'Ingresa una cantidad válida mayor a 0.';
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      this.errorMessage = 'Ingresa un monto válido para calcular la cantidad de SMS.';
      return;
    }

    try {
      this.submitting = true;

      await this.backofficeService.addSmsInventory({
        quantity,
        amount,
        operation_number: this.purchaseForm.operationNumber || null,
        notes: this.purchaseForm.notes || null
      });

      this.successMessage = 'Compra de SMS agregada al inventario exitosamente';
      this.showPurchaseModal = false;
      this.purchaseForm = { quantity: '', amount: '', operationNumber: '', notes: '' };
      await this.loadDashboard();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'Error al agregar SMS al inventario.';
    } finally {
      this.submitting = false;
    }
  }

  async handleProviderBalanceSync(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.syncingProviderBalance = true;

    try {
      const result = await this.backofficeService.syncProviderBalance();
      this.providerBalance = result.external_balance;
      this.providerBalanceProvider = result.provider;
      this.providerBalanceCheckedAt = new Date().toISOString();
      this.successMessage = 'Saldo proveedor consultado y snapshot guardado.';
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo consultar saldo proveedor.';
      this.providerBalance = null;
    } finally {
      this.syncingProviderBalance = false;
    }
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

  toNumber(value: string): number {
    return Number.parseFloat(value || '0');
  }

  private safeMetric(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private debugDashboard(message: string): void {
    if (environment.production) {
      return;
    }

    console.debug(message, {
      inventoryAvailableSms: this.inventoryAvailableSms,
      inventoryTotalSms: this.inventoryTotalSms,
      totalRevenue: this.totalRevenue,
      approvedSmsSold: this.approvedSmsSold,
      pendingRecharges: this.pendingRecharges,
      totalUsers: this.totalUsers,
      activeUsers: this.activeUsers
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  BackofficeService,
  InventoryPurchaseRecord
} from '@sms-fortuna/shared';

const WHOLESALE_SMS_COST = 0.04012;

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingRecharges: number;
  totalSmsBalance: number;
  inventoryAvailable: number;
  inventorySold: number;
  inventoryTotal: number;
  totalMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  totalRevenue: number;
}

interface StatCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: 'package' | 'trendingUp' | 'creditCard' | 'users';
  textColor: string;
  bgColor: string;
}

@Component({
  selector: 'bo-dashboard-page',
  standalone: true,
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
    inventoryTotal: 0,
    totalMessages: 0,
    sentMessages: 0,
    deliveredMessages: 0,
    totalRevenue: 0
  };

  loading = true;
  submitting = false;
  showPurchaseModal = false;
  showPurchaseHistory = false;
  purchases: InventoryPurchaseRecord[] = [];
  errorMessage = '';
  successMessage = '';
  purchaseForm = {
    quantity: '',
    amount: '',
    operationNumber: '',
    notes: ''
  };

  get statCards(): StatCard[] {
    return [
      {
        title: 'Inventario Disponible',
        value: this.formatNumber(this.stats.inventoryAvailable),
        subtitle: `Total: ${this.formatNumber(this.stats.inventoryTotal)} SMS`,
        icon: 'package',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Ingresos',
        value: `S/ ${this.formatCurrency(this.stats.totalRevenue)}`,
        subtitle: `${this.formatNumber(this.stats.inventorySold)} SMS vendidos`,
        icon: 'trendingUp',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Recargas Pendientes',
        value: this.stats.pendingRecharges,
        subtitle: `${this.stats.activeUsers} usuarios activos`,
        icon: 'creditCard',
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-50'
      },
      {
        title: 'Total Usuarios',
        value: this.stats.totalUsers,
        subtitle: `${this.stats.activeUsers} activos`,
        icon: 'users',
        textColor: 'text-slate-600',
        bgColor: 'bg-slate-50'
      }
    ];
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
    return this.stats.sentMessages > 0
      ? `${((this.stats.deliveredMessages / this.stats.sentMessages) * 100).toFixed(1)}%`
      : '0%';
  }

  get totalPurchasedSms(): number {
    return this.purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
  }

  get totalPurchasedAmount(): number {
    return this.purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadStats(), this.loadPurchases()]);
    await this.loadInventory();
    this.loading = false;
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
        inventoryTotal: Number(statsData.inventory?.total_sms ?? 0),
        totalMessages: Number(statsData.messages?.total_messages ?? 0),
        sentMessages: Number(statsData.messages?.sent_messages ?? 0),
        deliveredMessages: Number(statsData.messages?.delivered_messages ?? 0),
        totalRevenue: Number.parseFloat(String(statsData.users?.total_revenue ?? 0))
      };
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar las estadísticas.';
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
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar el inventario.';
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
      await Promise.all([this.loadStats(), this.loadPurchases()]);
      await this.loadInventory();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'Error al agregar SMS al inventario.';
    } finally {
      this.submitting = false;
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
}

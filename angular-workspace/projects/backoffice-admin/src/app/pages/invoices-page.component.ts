import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminRecharge, RechargesService, formatCurrency, formatDateTime, formatNumber } from '@sms-fortuna/shared';
import { EmptyStateComponent } from '../components/empty-state.component';
import { LoadingStateComponent } from '../components/loading-state.component';

interface InternalReceipt {
  recharge_id: string;
  invoice_date: string;
  user_id: string;
  user_name: string;
  user_email: string;
  razon_social: string | null;
  ruc: string | null;
  package_name: string;
  quantity: number;
  amount: number;
  payment_method: string | null;
  operation_code: string | null;
  approved_at: string;
  status: string;
}

@Component({
  selector: 'bo-invoices-page',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, LoadingStateComponent],
  templateUrl: './invoices-page.component.html',
  styleUrl: './invoices-page.component.scss'
})
export class InvoicesPageComponent implements OnInit {
  private readonly rechargesService = inject(RechargesService);

  invoices: InternalReceipt[] = [];
  loading = true;
  errorMessage = '';
  noticeMessage = 'Comprobantes internos basados en recargas aprobadas. No emite comprobantes SUNAT.';
  searchTerm = '';
  dateFrom = '';
  dateTo = '';
  paymentMethod = 'all';
  selectedInvoice: InternalReceipt | null = null;
  readonly formatNumber = formatNumber;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDateTime;

  get filteredInvoices(): InternalReceipt[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.invoices.filter((invoice) => {
      const matchesSearch = !term ||
        invoice.user_name.toLowerCase().includes(term) ||
        invoice.user_email.toLowerCase().includes(term) ||
        (invoice.razon_social ?? '').toLowerCase().includes(term) ||
        (invoice.ruc ?? '').toLowerCase().includes(term) ||
        (invoice.operation_code ?? '').toLowerCase().includes(term);

      const approvedAt = new Date(invoice.approved_at).getTime();
      const matchesFrom = !this.dateFrom || approvedAt >= new Date(`${this.dateFrom}T00:00:00`).getTime();
      const matchesTo = !this.dateTo || approvedAt <= new Date(`${this.dateTo}T23:59:59.999`).getTime();
      const matchesPayment = this.paymentMethod === 'all' || invoice.payment_method === this.paymentMethod;

      return matchesSearch && matchesFrom && matchesTo && matchesPayment;
    });
  }

  get paymentMethods(): string[] {
    return Array.from(new Set(this.invoices.map((invoice) => invoice.payment_method).filter(Boolean) as string[]));
  }

  get totalRevenue(): number {
    return this.filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  }

  get totalQuantity(): number {
    return this.filteredInvoices.reduce((sum, invoice) => sum + invoice.quantity, 0);
  }

  async ngOnInit(): Promise<void> {
    await this.loadInvoices();
  }

  async loadInvoices(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const recharges = await this.rechargesService.listAdminRecharges();
      this.invoices = recharges
        .filter((recharge) => recharge.status === 'approved')
        .map((recharge) => this.mapReceipt(recharge));
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar los comprobantes internos.';
      this.invoices = [];
    } finally {
      this.loading = false;
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.paymentMethod = 'all';
  }

  openDetail(invoice: InternalReceipt): void {
    this.selectedInvoice = invoice;
  }

  closeDetail(): void {
    this.selectedInvoice = null;
  }

  exportToCSV(): void {
    if (this.filteredInvoices.length === 0) {
      this.noticeMessage = 'No hay comprobantes internos para exportar con los filtros actuales.';
      return;
    }

    const rows = [
      ['fecha_aprobacion', 'cliente', 'email', 'ruc', 'razon_social', 'paquete', 'sms', 'monto', 'metodo_pago', 'codigo_operacion', 'estado'],
      ...this.filteredInvoices.map((invoice) => [
        invoice.approved_at,
        invoice.user_name,
        invoice.user_email,
        invoice.ruc ?? '',
        invoice.razon_social ?? '',
        invoice.package_name,
        String(invoice.quantity),
        invoice.amount.toFixed(2),
        invoice.payment_method ?? '',
        invoice.operation_code ?? '',
        invoice.status
      ])
    ];

    const csv = rows.map((row) => row.map((cell) => this.escapeCsv(cell)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprobantes-internos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private mapReceipt(recharge: AdminRecharge): InternalReceipt {
    return {
      recharge_id: recharge.id,
      invoice_date: recharge.approved_at ?? recharge.created_at,
      user_id: recharge.user_id,
      user_name: recharge.profile?.full_name || recharge.profile?.razon_social || recharge.profile?.email || 'Cliente sin nombre',
      user_email: recharge.profile?.email || '-',
      razon_social: recharge.profile?.razon_social ?? null,
      ruc: recharge.profile?.ruc ?? null,
      package_name: recharge.package?.name || 'Paquete SMS',
      quantity: recharge.sms_credits,
      amount: recharge.amount,
      payment_method: recharge.payment_method,
      operation_code: recharge.operation_code,
      approved_at: recharge.approved_at ?? recharge.created_at,
      status: 'Aprobada'
    };
  }

  private escapeCsv(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}

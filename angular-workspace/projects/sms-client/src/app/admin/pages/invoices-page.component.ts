
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminRecharge, RechargesService, formatCurrency, formatNumber } from '@sms-fortuna/shared';
import { LoadingStateComponent } from '../components/loading-state.component';

interface Invoice {
  recharge_id: string;
  invoice_date: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_company: string | null;
  package_name: string;
  quantity: number;
  amount: number;
  payment_method: string;
  operation_code: string | null;
  approved_at: string | null;
  year: number;
  month: number;
  month_name: string;
}

interface MonthOption {
  value: number;
  name: string;
}

@Component({
    selector: 'bo-invoices-page',
    imports: [FormsModule, LoadingStateComponent],
    templateUrl: './invoices-page.component.html',
    styleUrl: './invoices-page.component.scss'
})
export class InvoicesPageComponent implements OnInit {
  private readonly rechargesService = inject(RechargesService);

  allInvoices: Invoice[] = [];
  loading = true;
  errorMessage = '';
  selectedYear = new Date().getFullYear();
  selectedMonth: number | null = null;
  availableYears: number[] = [this.selectedYear];
  readonly formatNumber = formatNumber;
  readonly formatCurrency = formatCurrency;

  readonly months: MonthOption[] = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' },
  ];

  get invoices(): Invoice[] {
    return this.allInvoices.filter((invoice) =>
      invoice.year === this.selectedYear &&
      (this.selectedMonth === null || invoice.month === this.selectedMonth)
    );
  }

  get selectedMonthName(): string {
    return this.months.find((month) => month.value === this.selectedMonth)?.name ?? '';
  }

  async ngOnInit(): Promise<void> {
    await this.loadInvoices();
  }

  async loadInvoices(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const recharges = await this.rechargesService.listAdminRecharges();
      this.allInvoices = recharges
        .filter((recharge) => recharge.status === 'approved')
        .map((recharge) => this.mapInvoice(recharge))
        .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
      this.availableYears = this.buildAvailableYears(this.allInvoices);

      if (!this.availableYears.includes(this.selectedYear)) {
        this.selectedYear = this.availableYears[0] ?? new Date().getFullYear();
      }
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar las facturas.';
      this.allInvoices = [];
      this.availableYears = [this.selectedYear];
    } finally {
      this.loading = false;
    }
  }

  getTotalRevenue(): number {
    return this.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  }

  getTotalQuantity(): number {
    return this.invoices.reduce((sum, invoice) => sum + Number(invoice.quantity), 0);
  }

  clearFilters(): void {
    this.selectedMonth = null;
    this.selectedYear = new Date().getFullYear();

    if (!this.availableYears.includes(this.selectedYear)) {
      this.selectedYear = this.availableYears[0] ?? new Date().getFullYear();
    }
  }

  exportToCSV(): void {
    if (this.invoices.length === 0) {
      return;
    }

    const headers = [
      'Fecha',
      'Cliente',
      'Email',
      'Empresa',
      'Paquete',
      'SMS',
      'Monto',
      'Método',
      'Código Operación'
    ];

    const rows = this.invoices.map((invoice) => [
      this.formatDate(invoice.invoice_date),
      invoice.user_name,
      invoice.user_email,
      invoice.user_company || '-',
      invoice.package_name,
      String(invoice.quantity),
      invoice.amount.toFixed(2),
      invoice.payment_method,
      invoice.operation_code || '-'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facturas-${this.selectedYear}${this.selectedMonth ? `-${String(this.selectedMonth).padStart(2, '0')}` : ''}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  private mapInvoice(recharge: AdminRecharge): Invoice {
    const invoiceDate = recharge.created_at;
    const date = new Date(invoiceDate);

    return {
      recharge_id: recharge.id,
      invoice_date: invoiceDate,
      user_id: recharge.user_id,
      user_name: recharge.profile?.full_name?.trim() || recharge.profile?.email?.trim() || '-',
      user_email: recharge.profile?.email?.trim() || '-',
      user_company: recharge.profile?.razon_social?.trim() || null,
      package_name: recharge.package?.name || 'Paquete SMS',
      quantity: recharge.sms_credits,
      amount: recharge.amount,
      payment_method: recharge.payment_method || '-',
      operation_code: recharge.operation_code,
      approved_at: recharge.approved_at,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      month_name: this.months.find((month) => month.value === date.getMonth() + 1)?.name ?? ''
    };
  }

  private buildAvailableYears(invoices: Invoice[]): number[] {
    const years = Array.from(new Set(invoices.map((invoice) => invoice.year)))
      .sort((a, b) => b - a);

    return years.length > 0 ? years : [new Date().getFullYear()];
  }
}

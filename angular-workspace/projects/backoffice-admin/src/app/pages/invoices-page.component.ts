import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatCurrency, formatDateTime, formatNumber } from '@sms-fortuna/shared';
import { EmptyStateComponent } from '../components/empty-state.component';
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
  external_payment_id: string | null;
  approved_at: string;
  approved_by_name: string | null;
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
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, LoadingStateComponent],
  templateUrl: './invoices-page.component.html',
  styleUrl: './invoices-page.component.scss'
})
export class InvoicesPageComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = true;
  selectedYear = new Date().getFullYear();
  selectedMonth: number | null = null;
  availableYears: number[] = [this.selectedYear];
  noticeMessage = '';
  readonly formatNumber = formatNumber;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDateTime;

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

  ngOnInit(): void {
    this.invoices = [];
    this.loading = false;
  }

  get selectedMonthName(): string {
    return this.months.find((month) => month.value === this.selectedMonth)?.name ?? '';
  }

  clearFilters(): void {
    this.selectedMonth = null;
    this.selectedYear = new Date().getFullYear();
  }

  getTotalRevenue(): number {
    return this.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  }

  getTotalQuantity(): number {
    return this.invoices.reduce((sum, invoice) => sum + invoice.quantity, 0);
  }

  exportToCSV(): void {
    this.noticeMessage = 'La exportación segura de facturas se conectará cuando exista backend y base de datos definidos.';
  }
}

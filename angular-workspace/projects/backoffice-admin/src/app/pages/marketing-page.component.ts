import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

interface MarketingStats {
  current_month: {
    revenue: number;
    month_name: string;
    year: number;
  };
  last_month: {
    revenue: number;
    month_name: string;
    year: number;
  };
  growth: {
    amount: number;
    percentage: number;
    is_growing: boolean;
  };
  customers: {
    total: number;
    active: number;
    new_this_month: number;
    retention_rate: number;
  };
  avg_recharge_amount: number;
}

interface RevenueTrend {
  year: number;
  month: number;
  month_name: string;
  revenue: number;
  recharges_count: number;
  unique_customers: number;
  avg_recharge_value: number;
}

interface CustomerAcquisition {
  year: number;
  month: number;
  month_name: string;
  new_customers: number;
  repeat_customers: number;
  total_revenue: number;
  revenue_from_new: number;
  revenue_from_repeat: number;
}

interface TopCustomer {
  user_id: string;
  full_name: string;
  email: string;
  company: string | null;
  total_revenue: number;
  total_recharges: number;
  avg_recharge_amount: number;
  last_recharge_date: string;
  sms_balance: number;
}

@Component({
  selector: 'bo-marketing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marketing-page.component.html',
  styleUrl: './marketing-page.component.scss'
})
export class MarketingPageComponent implements OnInit {
  loading = true;
  stats: MarketingStats | null = null;
  revenueTrends: RevenueTrend[] = [];
  acquisitionStats: CustomerAcquisition[] = [];
  topCustomers: TopCustomer[] = [];

  ngOnInit(): void {
    const now = new Date();
    this.stats = {
      current_month: {
        revenue: 0,
        month_name: this.monthName(now),
        year: now.getFullYear(),
      },
      last_month: {
        revenue: 0,
        month_name: this.monthName(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        year: new Date(now.getFullYear(), now.getMonth() - 1, 1).getFullYear(),
      },
      growth: {
        amount: 0,
        percentage: 0,
        is_growing: true,
      },
      customers: {
        total: 0,
        active: 0,
        new_this_month: 0,
        retention_rate: 0,
      },
      avg_recharge_amount: 0,
    };
    this.revenueTrends = [];
    this.acquisitionStats = [];
    this.topCustomers = [];
    this.loading = false;
  }

  getMaxRevenue(): number {
    if (this.revenueTrends.length === 0) {
      return 0;
    }

    return Math.max(...this.revenueTrends.map((trend) => Number(trend.revenue)));
  }

  getRevenueBarHeight(revenue: number): number {
    const max = this.getMaxRevenue();
    if (max === 0) {
      return 0;
    }

    return (Number(revenue) / max) * 100;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value || 0);
  }

  private monthName(date: Date): string {
    const month = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(date);
    return month.charAt(0).toUpperCase() + month.slice(1);
  }
}

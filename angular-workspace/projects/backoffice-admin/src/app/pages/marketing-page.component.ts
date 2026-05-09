import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AdminRecharge, BackofficeClientProfile, BackofficeService, RechargesService } from '@sms-fortuna/shared';

interface MarketingStats {
  currentMonth: {
    revenue: number;
    monthName: string;
  };
  lastMonth: {
    revenue: number;
    monthName: string;
  };
  growth: {
    amount: number;
    percentage: number;
    label: string;
    isGrowing: boolean;
  };
  customers: {
    total: number;
    active: number;
    newThisMonth: number;
    retentionRate: number;
    customersWithPurchase: number;
    recurrentCustomers: number;
  };
  avgRechargeAmount: number;
}

interface RevenueTrend {
  key: string;
  year: number;
  month: number;
  monthName: string;
  revenue: number;
  rechargesCount: number;
  uniqueCustomers: number;
  avgRechargeValue: number;
}

interface CustomerAcquisition {
  key: string;
  year: number;
  monthName: string;
  newCustomers: number;
  repeatCustomers: number;
  totalRevenue: number;
}

interface TopCustomer {
  userId: string;
  fullName: string;
  email: string;
  company: string | null;
  totalRevenue: number;
  totalRecharges: number;
  avgRechargeAmount: number;
  lastRechargeDate: string;
}

interface MarketingRecommendation {
  tone: 'red' | 'orange' | 'blue' | 'green' | 'neutral';
  icon: 'alert' | 'users' | 'trend' | 'userPlus' | 'award';
  title: string;
  message: string;
}

@Component({
    selector: 'bo-marketing-page',
    imports: [CommonModule],
    templateUrl: './marketing-page.component.html',
    styleUrl: './marketing-page.component.scss'
})
export class MarketingPageComponent implements OnInit {
  private readonly rechargesService = inject(RechargesService);
  private readonly backofficeService = inject(BackofficeService);

  loading = true;
  errorMessage = '';
  approvedRecharges: AdminRecharge[] = [];
  clients: BackofficeClientProfile[] = [];
  stats: MarketingStats | null = null;
  revenueTrends: RevenueTrend[] = [];
  acquisitionStats: CustomerAcquisition[] = [];
  topCustomers: TopCustomer[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadMarketingData();
  }

  async loadMarketingData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const [recharges, clients] = await Promise.all([
        this.rechargesService.listAdminRecharges(),
        this.backofficeService.listClients()
      ]);

      this.approvedRecharges = recharges.filter((recharge) => recharge.status === 'approved');
      this.clients = clients;
      this.stats = this.buildStats();
      this.revenueTrends = this.buildRevenueTrends(12);
      this.acquisitionStats = this.buildAcquisitionStats(12);
      this.topCustomers = this.buildTopCustomers(5);
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar las métricas de marketing.';
      this.approvedRecharges = [];
      this.clients = [];
      this.stats = this.buildStats();
      this.revenueTrends = this.buildRevenueTrends(12);
      this.acquisitionStats = [];
      this.topCustomers = [];
    } finally {
      this.loading = false;
    }
  }

  get recommendations(): MarketingRecommendation[] {
    if (!this.stats) {
      return [];
    }

    if (!this.approvedRecharges.length && !this.clients.length) {
      return [{
        tone: 'neutral',
        icon: 'alert',
        title: 'Información insuficiente',
        message: 'Aún no hay suficiente información para generar recomendaciones.'
      }];
    }

    const recommendations: MarketingRecommendation[] = [];
    const currentRevenue = this.stats.currentMonth.revenue;
    const lastRevenue = this.stats.lastMonth.revenue;

    if (lastRevenue > 0 && currentRevenue < lastRevenue) {
      const drop = ((lastRevenue - currentRevenue) / lastRevenue) * 100;
      recommendations.push({
        tone: 'red',
        icon: 'alert',
        title: 'Ingresos en Descenso',
        message: `Tus ingresos han disminuido ${drop.toFixed(1)}% este mes. Considera contactar clientes inactivos o lanzar una campaña promocional.`
      });
    }

    if (this.stats.customers.total > 0) {
      const activeRate = (this.stats.customers.active / this.stats.customers.total) * 100;
      if (activeRate < 40) {
        recommendations.push({
          tone: 'orange',
          icon: 'users',
          title: 'Baja Retención',
          message: `Solo el ${activeRate.toFixed(1)}% de tus clientes están activos. Implementa programas de fidelización o descuentos por volumen.`
        });
      }
    }

    if (this.stats.customers.newThisMonth === 0) {
      recommendations.push({
        tone: 'blue',
        icon: 'userPlus',
        title: 'Sin Nuevos Clientes',
        message: 'No has adquirido nuevos clientes este mes. Considera campañas de adquisición o programas de referidos.'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        tone: 'green',
        icon: 'award',
        title: 'Buen Desempeño',
        message: 'Los indicadores principales se mantienen saludables este mes.'
      });
    }

    return recommendations;
  }

  getMaxRevenue(): number {
    return Math.max(0, ...this.revenueTrends.map((trend) => trend.revenue));
  }

  getRevenueBarHeight(revenue: number): number {
    const max = this.getMaxRevenue();
    return max > 0 ? (revenue / max) * 100 : 0;
  }

  hasRevenueTrendData(): boolean {
    return this.revenueTrends.some((trend) => trend.revenue > 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PE').format(value || 0);
  }

  formatSignedCurrency(value: number): string {
    const formatted = this.formatCurrency(Math.abs(value));
    return `${value >= 0 ? '+' : '-'}${formatted}`;
  }

  private buildStats(): MarketingStats {
    const now = new Date();
    const currentKey = this.monthKey(now);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = this.monthKey(lastMonth);
    const currentMonthRecharges = this.rechargesByMonth(currentKey);
    const lastMonthRecharges = this.rechargesByMonth(lastKey);
    const currentRevenue = this.sumRevenue(currentMonthRecharges);
    const lastRevenue = this.sumRevenue(lastMonthRecharges);
    const growthAmount = currentRevenue - lastRevenue;
    const growthPercentage = this.calculateGrowthPercentage(currentRevenue, lastRevenue);
    const firstPurchaseByClient = this.firstPurchaseByClient();
    const activeClientIds = new Set(currentMonthRecharges.map((recharge) => recharge.user_id).filter(Boolean));
    const customersWithPurchase = new Set(this.approvedRecharges.map((recharge) => recharge.user_id).filter(Boolean));
    const recurrentCustomers = this.countRecurrentCustomers();
    const newThisMonth = Array.from(firstPurchaseByClient.values())
      .filter((date) => this.monthKey(date) === currentKey)
      .length;
    const avgBase = currentMonthRecharges.length ? currentMonthRecharges : this.approvedRecharges;

    return {
      currentMonth: {
        revenue: currentRevenue,
        monthName: this.monthName(now)
      },
      lastMonth: {
        revenue: lastRevenue,
        monthName: this.monthName(lastMonth)
      },
      growth: {
        amount: growthAmount,
        percentage: growthPercentage,
        label: this.growthLabel(currentRevenue, lastRevenue, growthPercentage),
        isGrowing: growthAmount >= 0
      },
      customers: {
        total: this.clients.length,
        active: activeClientIds.size,
        newThisMonth,
        retentionRate: customersWithPurchase.size > 0 ? (recurrentCustomers / customersWithPurchase.size) * 100 : 0,
        customersWithPurchase: customersWithPurchase.size,
        recurrentCustomers
      },
      avgRechargeAmount: avgBase.length ? this.sumRevenue(avgBase) / avgBase.length : 0
    };
  }

  private buildRevenueTrends(months: number): RevenueTrend[] {
    return this.lastMonths(months).map((date) => {
      const key = this.monthKey(date);
      const recharges = this.rechargesByMonth(key);
      const revenue = this.sumRevenue(recharges);
      const uniqueCustomers = new Set(recharges.map((recharge) => recharge.user_id).filter(Boolean)).size;

      return {
        key,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        monthName: this.monthName(date),
        revenue,
        rechargesCount: recharges.length,
        uniqueCustomers,
        avgRechargeValue: recharges.length ? revenue / recharges.length : 0
      };
    });
  }

  private buildAcquisitionStats(months: number): CustomerAcquisition[] {
    const firstPurchase = this.firstPurchaseByClient();

    return this.lastMonths(months)
      .map((date) => {
        const key = this.monthKey(date);
        const recharges = this.rechargesByMonth(key);
        const customersInMonth = new Set(recharges.map((recharge) => recharge.user_id).filter(Boolean));
        let newCustomers = 0;
        let repeatCustomers = 0;

        for (const userId of customersInMonth) {
          const firstDate = firstPurchase.get(userId);
          if (firstDate && this.monthKey(firstDate) === key) {
            newCustomers += 1;
          } else {
            repeatCustomers += 1;
          }
        }

        return {
          key,
          year: date.getFullYear(),
          monthName: this.monthName(date),
          newCustomers,
          repeatCustomers,
          totalRevenue: this.sumRevenue(recharges)
        };
      })
      .filter((item) => item.newCustomers > 0 || item.repeatCustomers > 0 || item.totalRevenue > 0)
      .slice(-6);
  }

  private buildTopCustomers(limit: number): TopCustomer[] {
    const profilesById = new Map(this.clients.map((client) => [client.id, client]));
    const grouped = new Map<string, TopCustomer>();

    for (const recharge of this.approvedRecharges) {
      const userId = recharge.user_id || 'unknown';
      const profile = profilesById.get(userId);
      const current = grouped.get(userId) ?? {
        userId,
        fullName: profile?.full_name || profile?.email || recharge.profile?.full_name || recharge.profile?.email || '-',
        email: profile?.email || recharge.profile?.email || '-',
        company: profile?.razon_social || profile?.ruc || recharge.profile?.razon_social || null,
        totalRevenue: 0,
        totalRecharges: 0,
        avgRechargeAmount: 0,
        lastRechargeDate: this.rechargeDate(recharge).toISOString()
      };

      current.totalRevenue += Number(recharge.amount ?? 0);
      current.totalRecharges += 1;
      current.avgRechargeAmount = current.totalRevenue / current.totalRecharges;

      const rechargeTime = this.rechargeDate(recharge).getTime();
      if (rechargeTime > new Date(current.lastRechargeDate).getTime()) {
        current.lastRechargeDate = this.rechargeDate(recharge).toISOString();
      }

      grouped.set(userId, current);
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalRecharges - a.totalRecharges)
      .slice(0, limit);
  }

  private rechargesByMonth(key: string): AdminRecharge[] {
    return this.approvedRecharges.filter((recharge) => this.monthKey(this.rechargeDate(recharge)) === key);
  }

  private firstPurchaseByClient(): Map<string, Date> {
    const firstPurchase = new Map<string, Date>();

    for (const recharge of this.approvedRecharges) {
      if (!recharge.user_id) {
        continue;
      }

      const date = this.rechargeDate(recharge);
      const current = firstPurchase.get(recharge.user_id);

      if (!current || date.getTime() < current.getTime()) {
        firstPurchase.set(recharge.user_id, date);
      }
    }

    return firstPurchase;
  }

  private countRecurrentCustomers(): number {
    const counts = new Map<string, number>();

    for (const recharge of this.approvedRecharges) {
      if (!recharge.user_id) {
        continue;
      }

      counts.set(recharge.user_id, (counts.get(recharge.user_id) ?? 0) + 1);
    }

    return Array.from(counts.values()).filter((count) => count > 1).length;
  }

  private lastMonths(count: number): Date[] {
    const now = new Date();
    return Array.from({ length: count }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1));
  }

  private rechargeDate(recharge: AdminRecharge): Date {
    return new Date(recharge.approved_at || recharge.created_at);
  }

  private monthKey(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }

  private monthName(value: Date): string {
    return new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(value);
  }

  private sumRevenue(recharges: AdminRecharge[]): number {
    return recharges.reduce((sum, recharge) => sum + Number(recharge.amount ?? 0), 0);
  }

  private calculateGrowthPercentage(currentRevenue: number, lastRevenue: number): number {
    if (lastRevenue > 0) {
      return ((currentRevenue - lastRevenue) / lastRevenue) * 100;
    }

    if (currentRevenue > 0) {
      return 100;
    }

    return 0;
  }

  private growthLabel(currentRevenue: number, lastRevenue: number, percentage: number): string {
    if (lastRevenue === 0 && currentRevenue > 0) {
      return 'Nuevo ingreso';
    }

    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  }
}

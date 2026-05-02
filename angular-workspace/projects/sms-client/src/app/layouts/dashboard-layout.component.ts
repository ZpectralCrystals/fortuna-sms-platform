import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService, SupabaseService } from '@sms-fortuna/shared';

interface DashboardProfile {
  id: string;
  email: string;
  full_name: string | null;
  razon_social: string | null;
  credits: number;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: 'dashboard' | 'send' | 'history' | 'analytics' | 'templates' | 'keys' | 'recharges';
}

const NAVIGATION: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { name: 'Enviar SMS', href: '/dashboard/send', icon: 'send' },
  { name: 'Historial', href: '/dashboard/history', icon: 'history' },
  { name: 'Análisis', href: '/dashboard/analytics', icon: 'analytics' },
  { name: 'Plantillas', href: '/dashboard/templates', icon: 'templates' },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: 'keys' },
  { name: 'Recargas', href: '/dashboard/recharges', icon: 'recharges' }
];

@Component({
  selector: 'sms-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  readonly navigation = NAVIGATION;
  sidebarOpen = false;
  loggingOut = false;
  errorMessage = '';
  profile: DashboardProfile | null = null;
  userEmail = '';

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  get credits(): number {
    return Number(this.profile?.credits ?? 0);
  }

  get balanceInSoles(): number {
    return this.credits * 0.08;
  }

  get balanceClass(): string {
    if (this.balanceInSoles > 30) return 'balance-card balance-card--high';
    if (this.balanceInSoles >= 12) return 'balance-card balance-card--medium';
    return 'balance-card balance-card--low';
  }

  get displayName(): string {
    return this.profile?.full_name || this.userEmail || 'Usuario';
  }

  get companyName(): string {
    return this.profile?.razon_social || 'Sin empresa';
  }

  openSidebar(): void {
    this.sidebarOpen = true;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  isActive(href: string): boolean {
    return this.router.url === href;
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatCredits(value: number): string {
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 0
    });
  }

  async logout(): Promise<void> {
    this.errorMessage = '';

    try {
      this.loggingOut = true;
      await this.authService.logout();
      await this.router.navigate(['/login']);
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo cerrar sesión.';
    } finally {
      this.loggingOut = false;
    }
  }

  private async loadProfile(): Promise<void> {
    try {
      const { data: sessionData } = await this.supabase.instance.auth.getSession();
      const user = sessionData.session?.user;
      this.userEmail = user?.email ?? '';

      if (!user) {
        return;
      }

      this.profile = await this.authService.getCurrentProfile();
    } catch {
      this.profile = null;
    }
  }
}

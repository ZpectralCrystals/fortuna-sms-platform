
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '@sms-fortuna/shared';

interface NavigationItem {
  name: string;
  path: string;
  icon: string;
  visible?: boolean;
}

const SHOW_SMS_ALERTS_NAV = false;

@Component({
    selector: 'bo-admin-layout',
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './admin-layout.component.html',
    styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly allNavigation: NavigationItem[] = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { name: 'Usuarios', path: '/admin/users', icon: 'users' },
    { name: 'Recargas', path: '/admin/recharges', icon: 'recharges' },
    { name: 'Cuentas', path: '/admin/accounts', icon: 'accounts' },
    { name: 'Mensajes', path: '/admin/messages', icon: 'messages' },
    { name: 'API Keys', path: '/admin/api-keys', icon: 'apiKeys' },
    { name: 'Alertas SMS', path: '/admin/alerts', icon: 'alerts', visible: SHOW_SMS_ALERTS_NAV },
    { name: 'Facturas', path: '/admin/invoices', icon: 'invoices' },
    { name: 'Marketing', path: '/admin/marketing', icon: 'marketing' }
  ];
  readonly navigation: NavigationItem[] = this.allNavigation.filter((item) => item.visible !== false);

  loading = false;
  errorMessage = '';
  mobileMenuOpen = false;
  adminName = 'Administrador Principal';
  adminEmail = 'admin@fortuna.com.pe';

  get pageTitle(): string {
    const path = this.router.url.split('?')[0].split('#')[0];
    return this.allNavigation.find((item) => item.path === path)?.name ?? 'Dashboard';
  }

  async ngOnInit(): Promise<void> {
    await this.loadAdminInfo();
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  async logout(): Promise<void> {
    this.errorMessage = '';

    try {
      this.loading = true;
      await this.authService.logout();
      await this.router.navigate(['/login']);
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo cerrar sesión.';
    } finally {
      this.loading = false;
    }
  }

  private async loadAdminInfo(): Promise<void> {
    try {
      const admin = await this.authService.getCurrentAdmin();

      if (!admin) {
        return;
      }

      this.adminName = admin.full_name?.trim()
        ? admin.full_name
        : 'Administrador Principal';
      this.adminEmail = admin.email || 'admin@fortuna.com.pe';
    } catch {
      this.adminName = 'Administrador Principal';
      this.adminEmail = 'admin@fortuna.com.pe';
    }
  }
}

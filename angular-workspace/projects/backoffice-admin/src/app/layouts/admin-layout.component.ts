import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';
import { SupabaseService } from '../../../../shared/src/lib/services/supabase.service';

interface NavigationItem {
  name: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'bo-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  readonly navigation: NavigationItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Usuarios', path: '/users', icon: 'users' },
    { name: 'Recargas', path: '/recharges', icon: 'recharges' },
    { name: 'Cuentas', path: '/accounts', icon: 'accounts' },
    { name: 'Mensajes', path: '/messages', icon: 'messages' },
    { name: 'API Keys', path: '/api-keys', icon: 'apiKeys' },
    { name: 'Alertas SMS', path: '/alerts', icon: 'alerts' },
    { name: 'Facturas', path: '/invoices', icon: 'invoices' },
    { name: 'Marketing', path: '/marketing', icon: 'marketing' },
    { name: 'Sincronización', path: '/sync', icon: 'sync' },
    { name: 'Kit Integración', path: '/integration-kit', icon: 'integrationKit' }
  ];

  loading = false;
  errorMessage = '';
  mobileMenuOpen = false;
  adminName = 'Administrador Principal';
  adminEmail = 'admin@fortuna.com.pe';

  get pageTitle(): string {
    const path = this.router.url.split('?')[0].split('#')[0];
    return this.navigation.find((item) => item.path === path)?.name ?? 'Dashboard';
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
      const { data, error } = await this.supabaseService.instance.auth.getSession();

      if (error || !data.session?.user) {
        return;
      }

      const user = data.session.user;
      const fullName = user.user_metadata?.['full_name'];

      this.adminName = typeof fullName === 'string' && fullName.trim()
        ? fullName
        : 'Administrador Principal';
      this.adminEmail = user.email ?? 'admin@fortuna.com.pe';
    } catch {
      this.adminName = 'Administrador Principal';
      this.adminEmail = 'admin@fortuna.com.pe';
    }
  }
}

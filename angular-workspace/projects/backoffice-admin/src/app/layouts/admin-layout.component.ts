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
  template: `
    <div class="layout-root">
      <div class="layout-flex">
        <aside class="sidebar" [class.sidebar-open]="mobileMenuOpen">
          <div class="sidebar-inner">
            <div class="brand-row">
              <div class="brand">
                <div class="brand-icon">
                  <svg
                    class="brand-icon-svg"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <h1>SMS Fortuna</h1>
                  <p>Backoffice</p>
                </div>
              </div>

              <button
                class="icon-button close-button"
                type="button"
                aria-label="Cerrar menú"
                (click)="mobileMenuOpen = false"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <nav class="side-nav" aria-label="Navegación backoffice">
              <a
                *ngFor="let item of navigation"
                class="nav-link"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
                [routerLink]="item.path"
                (click)="closeMobileMenu()"
              >
                <ng-container [ngSwitch]="item.icon">
                  <svg
                    *ngSwitchCase="'dashboard'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  </svg>

                  <svg
                    *ngSwitchCase="'users'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>

                  <svg
                    *ngSwitchCase="'recharges'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" x2="22" y1="10" y2="10" />
                  </svg>

                  <svg
                    *ngSwitchCase="'accounts'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="10" r="3" />
                    <path d="M7 20.66a7 7 0 0 1 10 0" />
                  </svg>

                  <svg
                    *ngSwitchCase="'messages'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>

                  <svg
                    *ngSwitchCase="'apiKeys'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="7.5" cy="15.5" r="5.5" />
                    <path d="m21 2-9.6 9.6" />
                    <path d="m15.5 7.5 3 3L22 7l-3-3" />
                  </svg>

                  <svg
                    *ngSwitchCase="'alerts'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.674C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
                  </svg>

                  <svg
                    *ngSwitchCase="'invoices'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M10 9H8" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                  </svg>

                  <svg
                    *ngSwitchCase="'marketing'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>

                  <svg
                    *ngSwitchCase="'sync'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 16h5v5" />
                  </svg>

                  <svg
                    *ngSwitchCase="'integrationKit'"
                    class="nav-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m7.5 4.27 9 5.15" />
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                </ng-container>
                <span>{{ item.name }}</span>
              </a>
            </nav>

            <div class="admin-block">
              <div class="admin-info">
                <div>
                  <p class="admin-name">{{ adminName }}</p>
                  <p class="admin-email">{{ adminEmail }}</p>
                </div>
              </div>

              <button
                class="logout-button"
                type="button"
                (click)="logout()"
                [disabled]="loading"
              >
                <svg
                  class="logout-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                <span>{{ loading ? 'Cerrando...' : 'Cerrar sesión' }}</span>
              </button>

              <p *ngIf="errorMessage" class="error-message">
                {{ errorMessage }}
              </p>
            </div>
          </div>
        </aside>

        <div class="main-column">
          <header class="topbar">
            <div class="topbar-inner">
              <button
                class="icon-button menu-button"
                type="button"
                aria-label="Abrir menú"
                (click)="mobileMenuOpen = true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </button>

              <h2>{{ pageTitle }}</h2>
              <div class="topbar-spacer" aria-hidden="true"></div>
            </div>
          </header>

          <main class="content">
            <router-outlet />
          </main>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .layout-root {
      min-height: 100vh;
      background: #f8fafc;
      color: #0f172a;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .layout-flex {
      display: flex;
    }

    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 50;
      width: 16rem;
      background: #0f172a;
      transform: translateX(-100%);
      transition: transform 300ms ease-in-out;
    }

    .sidebar.sidebar-open {
      transform: translateX(0);
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      border-bottom: 1px solid #1e293b;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-icon {
      width: 2.5rem;
      height: 2.5rem;
      background: #2563eb;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex: 0 0 auto;
    }

    .brand-icon-svg {
      width: 1.5rem;
      height: 1.5rem;
    }

    .brand h1 {
      margin: 0;
      color: #ffffff;
      font-size: 1.125rem;
      line-height: 1.75rem;
      font-weight: 700;
      letter-spacing: 0;
    }

    .brand p {
      margin: 0;
      color: #94a3b8;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
    }

    .close-button {
      color: #94a3b8;
    }

    .close-button:hover,
    .menu-button:hover {
      color: #ffffff;
    }

    .side-nav {
      flex: 1;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .nav-link {
      width: 100%;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      color: #cbd5e1;
      text-decoration: none;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .nav-link:hover {
      background: #1e293b;
      color: #ffffff;
    }

    .nav-link.active {
      background: #2563eb;
      color: #ffffff;
    }

    .nav-icon {
      width: 1.25rem;
      height: 1.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }

    .nav-link span:last-child,
    .logout-button span {
      font-weight: 500;
    }

    .admin-block {
      padding: 1rem;
      border-top: 1px solid #1e293b;
    }

    .admin-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding: 0 1rem;
    }

    .admin-name {
      margin: 0;
      color: #ffffff;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
    }

    .admin-email {
      margin: 0;
      color: #94a3b8;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .logout-button {
      width: 100%;
      border: 0;
      background: transparent;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      color: #f87171;
      cursor: pointer;
      transition: background-color 150ms ease, opacity 150ms ease;
    }

    .logout-button:hover:not(:disabled) {
      background: #1e293b;
    }

    .logout-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .logout-icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .error-message {
      margin: 0.75rem 1rem 0;
      color: #fca5a5;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .main-column {
      flex: 1;
      min-width: 0;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 40;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }

    .topbar-inner {
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .menu-button {
      color: #475569;
    }

    .menu-button:hover {
      color: #0f172a;
    }

    .topbar h2 {
      margin: 0;
      color: #0f172a;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 700;
      letter-spacing: 0;
    }

    .topbar-spacer {
      width: 2rem;
      height: 1px;
    }

    .content {
      padding: 1rem;
    }

    @media (min-width: 640px) {
      .topbar-inner {
        padding: 1rem 1.5rem;
      }

      .content {
        padding: 1.5rem;
      }
    }

    @media (min-width: 1024px) {
      .sidebar {
        transform: translateX(0);
      }

      .close-button,
      .menu-button {
        display: none;
      }

      .main-column {
        margin-left: 16rem;
      }

      .topbar-inner {
        padding: 1rem 2rem;
      }

      .content {
        padding: 2rem;
      }
    }
  `]
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

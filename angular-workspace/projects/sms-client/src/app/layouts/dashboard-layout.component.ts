import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService, SupabaseService } from '@sms-fortuna/shared';

interface DashboardProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  razon_social: string | null;
  credits: number | null;
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
  template: `
    <div class="dashboard-shell">
      <div
        class="sidebar-backdrop"
        [class.sidebar-backdrop--visible]="sidebarOpen"
        (click)="closeSidebar()"
        aria-hidden="true"
      ></div>

      <aside class="sidebar" [class.sidebar--open]="sidebarOpen" aria-label="Navegación principal">
        <div class="sidebar__inner">
          <div class="sidebar__brand">
            <a routerLink="/dashboard" class="brand-link" (click)="closeSidebar()">
              <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
              </svg>
              <span>
                <span class="brand-title">SMS Fortuna</span>
                <span class="brand-subtitle">Panel de control</span>
              </span>
            </a>
            <button type="button" class="icon-button sidebar__close" (click)="closeSidebar()" aria-label="Cerrar menú">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>

          <div class="sidebar__scroll">
            <div class="balance-card" [class]="balanceClass">
              <div class="balance-card__top">
                <span>Saldo disponible</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <path d="M2 10h20"></path>
                </svg>
              </div>
              <div class="balance-card__amount">S/ {{ formatCurrency(balanceInSoles) }}</div>
              <div class="balance-card__credits">{{ formatCredits(credits) }} SMS disponibles</div>
              <a routerLink="/dashboard/recharges" class="balance-card__action" (click)="closeSidebar()">Recargar</a>
            </div>

            <nav class="nav-list">
              <a
                *ngFor="let item of navigation"
                [routerLink]="item.href"
                class="nav-link"
                [class.nav-link--active]="isActive(item.href)"
                (click)="closeSidebar()"
              >
                <span class="nav-link__icon" [class.nav-link__icon--active]="isActive(item.href)">
                  <ng-container [ngSwitch]="item.icon">
                    <svg *ngSwitchCase="'dashboard'" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3" y="3" width="7" height="9"></rect>
                      <rect x="14" y="3" width="7" height="5"></rect>
                      <rect x="14" y="12" width="7" height="9"></rect>
                      <rect x="3" y="16" width="7" height="5"></rect>
                    </svg>
                    <svg *ngSwitchCase="'send'" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m22 2-7 20-4-9-9-4Z"></path>
                      <path d="M22 2 11 13"></path>
                    </svg>
                    <svg *ngSwitchCase="'history'" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M12 7v5l4 2"></path>
                    </svg>
                    <svg *ngSwitchCase="'analytics'" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3v18h18"></path>
                      <path d="M18 17V9"></path>
                      <path d="M13 17V5"></path>
                      <path d="M8 17v-3"></path>
                    </svg>
                    <svg *ngSwitchCase="'templates'" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <path d="M14 2v6h6"></path>
                      <path d="M16 13H8"></path>
                      <path d="M16 17H8"></path>
                      <path d="M10 9H8"></path>
                    </svg>
                    <svg *ngSwitchCase="'keys'" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="7.5" cy="15.5" r="5.5"></circle>
                      <path d="m21 2-9.6 9.6"></path>
                      <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
                    </svg>
                    <svg *ngSwitchCase="'recharges'" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                      <path d="M2 10h20"></path>
                    </svg>
                  </ng-container>
                </span>
                {{ item.name }}
              </a>
            </nav>
          </div>

          <div class="user-panel">
            <div class="user-panel__identity">
              <div class="user-avatar">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div class="user-panel__copy">
                <p>{{ displayName }}</p>
                <span>{{ companyName }}</span>
              </div>
            </div>

            <button type="button" class="logout-button" (click)="logout()" [disabled]="loggingOut">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <path d="m16 17 5-5-5-5"></path>
                <path d="M21 12H9"></path>
              </svg>
              {{ loggingOut ? 'Cerrando...' : 'Cerrar sesión' }}
            </button>
            <p *ngIf="errorMessage" class="logout-error">{{ errorMessage }}</p>
          </div>
        </div>
      </aside>

      <div class="content-shell">
        <div class="mobile-header">
          <button type="button" class="icon-button" (click)="openSidebar()" aria-label="Abrir menú">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h16"></path>
              <path d="M4 6h16"></path>
              <path d="M4 18h16"></path>
            </svg>
          </button>
          <div class="mobile-header__brand">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
            </svg>
            <span>SMS Fortuna</span>
          </div>
          <span class="mobile-header__spacer"></span>
        </div>

        <main class="dashboard-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      color: #111827;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    button {
      font: inherit;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .dashboard-shell {
      min-height: 100vh;
      background: #f9fafb;
    }

    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: none;
      background: rgba(17, 24, 39, 0.5);
    }

    .sidebar-backdrop--visible {
      display: block;
    }

    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 50;
      width: 256px;
      background: #ffffff;
      box-shadow: 0 10px 15px rgba(15, 23, 42, 0.1), 0 4px 6px rgba(15, 23, 42, 0.05);
      transform: translateX(-100%);
      transition: transform 300ms ease-in-out;
    }

    .sidebar--open {
      transform: translateX(0);
    }

    .sidebar__inner {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .sidebar__brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      border-bottom: 1px solid #e5e7eb;
      padding: 0 24px;
    }

    .brand-link,
    .mobile-header__brand {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      color: #2563eb;
      stroke-width: 2.5;
    }

    .brand-title {
      display: block;
      color: #111827;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.2;
    }

    .brand-subtitle {
      display: block;
      color: #6b7280;
      font-size: 12px;
      line-height: 1.2;
    }

    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 0;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
    }

    .icon-button svg {
      width: 24px;
      height: 24px;
    }

    .sidebar__close {
      display: inline-flex;
    }

    .sidebar__scroll {
      flex: 1;
      overflow-y: auto;
      padding: 24px 0;
    }

    .balance-card {
      margin: 0 16px 24px;
      border-radius: 8px;
      padding: 16px;
      color: #ffffff;
    }

    .balance-card--high {
      background: linear-gradient(90deg, #16a34a, #22c55e);
    }

    .balance-card--medium {
      background: linear-gradient(90deg, #ea580c, #f97316);
    }

    .balance-card--low {
      background: linear-gradient(90deg, #dc2626, #ef4444);
    }

    .balance-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
    }

    .balance-card__top svg {
      width: 20px;
      height: 20px;
    }

    .balance-card__amount {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.25;
    }

    .balance-card__credits {
      margin-top: 4px;
      font-size: 12px;
      opacity: 0.9;
    }

    .balance-card__action {
      display: block;
      width: 100%;
      margin-top: 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 10px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      transition: background 160ms ease;
    }

    .balance-card__action:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .nav-list {
      display: grid;
      gap: 4px;
      padding: 0 12px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      border-radius: 8px;
      padding: 10px 12px;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      transition: background 160ms ease, color 160ms ease;
    }

    .nav-link:hover {
      background: #f3f4f6;
    }

    .nav-link--active {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .nav-link__icon {
      width: 20px;
      height: 20px;
      margin-right: 12px;
      color: #9ca3af;
      flex: 0 0 auto;
    }

    .nav-link__icon--active {
      color: #2563eb;
    }

    .user-panel {
      border-top: 1px solid #e5e7eb;
      padding: 16px;
    }

    .user-panel__identity {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }

    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      background: #dbeafe;
      color: #2563eb;
      flex: 0 0 auto;
    }

    .user-avatar svg {
      width: 20px;
      height: 20px;
    }

    .user-panel__copy {
      min-width: 0;
      margin-left: 12px;
      flex: 1;
    }

    .user-panel__copy p,
    .user-panel__copy span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-panel__copy p {
      margin: 0;
      color: #111827;
      font-size: 14px;
      font-weight: 500;
    }

    .user-panel__copy span {
      color: #6b7280;
      font-size: 12px;
    }

    .logout-button {
      display: flex;
      align-items: center;
      width: 100%;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #dc2626;
      cursor: pointer;
      padding: 8px 12px;
      font-size: 14px;
      font-weight: 500;
      transition: background 160ms ease;
    }

    .logout-button:hover {
      background: #fef2f2;
    }

    .logout-button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .logout-button svg {
      width: 20px;
      height: 20px;
      margin-right: 12px;
    }

    .logout-error {
      margin: 8px 0 0;
      color: #b91c1c;
      font-size: 12px;
    }

    .content-shell {
      min-height: 100vh;
    }

    .mobile-header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      border-bottom: 1px solid #e5e7eb;
      background: #ffffff;
      padding: 0 16px;
    }

    .mobile-header__brand {
      color: #111827;
      font-size: 18px;
      font-weight: 700;
    }

    .mobile-header__brand svg {
      width: 24px;
      height: 24px;
      color: #2563eb;
      stroke-width: 2.5;
    }

    .mobile-header__spacer {
      width: 24px;
    }

    .dashboard-content {
      padding: 24px;
    }

    @media (min-width: 1024px) {
      .sidebar {
        transform: translateX(0);
      }

      .sidebar-backdrop {
        display: none;
      }

      .sidebar__close,
      .mobile-header {
        display: none;
      }

      .content-shell {
        padding-left: 256px;
      }

      .dashboard-content {
        padding: 32px;
      }
    }
  `]
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
    return this.profile?.company_name || this.profile?.razon_social || 'Sin empresa';
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

      const { data } = await this.supabase.instance
        .from('profiles')
        .select('id, email, full_name, company_name, razon_social, credits')
        .eq('id', user.id)
        .maybeSingle();

      this.profile = (data as DashboardProfile | null) ?? null;
    } catch {
      this.profile = null;
    }
  }
}

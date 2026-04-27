import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';

@Component({
  selector: 'sms-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <main class="page">
      <section class="card">
        <div class="header">
          <h1>Portal cliente</h1>

          <button type="button" (click)="logout()" [disabled]="loading">
            {{ loading ? 'Cerrando...' : 'Cerrar sesión' }}
          </button>
        </div>

        <nav class="nav" aria-label="Navegacion cliente">
          <a routerLink="/dashboard">Dashboard</a>
          <a routerLink="/dashboard/send">Enviar SMS</a>
          <a routerLink="/dashboard/history">Historial</a>
          <a routerLink="/dashboard/analytics">Analytics</a>
          <a routerLink="/dashboard/templates">Plantillas</a>
          <a routerLink="/dashboard/api-keys">API Keys</a>
          <a routerLink="/dashboard/recharges">Recargas</a>
        </nav>

        <p *ngIf="errorMessage" class="error">
          {{ errorMessage }}
        </p>

        <router-outlet />
      </section>
    </main>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    button {
      cursor: pointer;
      border: 0;
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      background: #111827;
      color: white;
      font-weight: 600;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error {
      margin-top: 1rem;
      color: #b91c1c;
      font-size: 0.875rem;
    }
  `]
})
export class DashboardLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  errorMessage = '';

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
}
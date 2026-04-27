import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';

@Component({
  selector: 'bo-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <main class="page">
      <section class="card">
        <div class="header">
          <h1>Backoffice</h1>

          <button type="button" (click)="logout()" [disabled]="loading">
            {{ loading ? 'Cerrando...' : 'Cerrar sesión' }}
          </button>
        </div>

        <nav class="nav" aria-label="Navegacion backoffice">
          <a routerLink="/dashboard">Dashboard</a>
          <a routerLink="/users">Usuarios</a>
          <a routerLink="/recharges">Recargas</a>
          <a routerLink="/accounts">Cuentas</a>
          <a routerLink="/messages">Mensajes</a>
          <a routerLink="/api-keys">API Keys</a>
          <a routerLink="/alerts">Alertas</a>
          <a routerLink="/invoices">Facturas</a>
          <a routerLink="/marketing">Marketing</a>
          <a routerLink="/sync">Sincronización</a>
          <a routerLink="/integration-kit">Kit integración</a>
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
export class AdminLayoutComponent {
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
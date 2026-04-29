import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';

@Component({
  selector: 'bo-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="login-page">
      <div class="login-shell">
        <section class="login-card">
          <div class="login-header">
            <div class="login-icon">
              <svg
                class="login-icon-svg"
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
            <h1>SMS Fortuna</h1>
            <p>Backoffice - Panel de Administración</p>
          </div>

          <form class="login-form" (ngSubmit)="submit()">
            <div class="field-group">
              <label for="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                autocomplete="email"
                placeholder="admin@fortunasms.com"
              />
            </div>

            <div class="field-group">
              <label for="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <p
              *ngIf="errorMessage"
              class="error-box"
            >
              {{ errorMessage }}
            </p>

            <button
              type="submit"
              [disabled]="loading"
            >
              {{ loading ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </form>
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      color: #0f172a;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .login-shell {
      max-width: 28rem;
      width: 100%;
    }

    .login-card {
      background: #ffffff;
      border-radius: 1rem;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
      padding: 2rem;
    }

    .login-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 2rem;
      text-align: center;
    }

    .login-icon {
      width: 4rem;
      height: 4rem;
      background: #2563eb;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      color: #ffffff;
    }

    .login-icon-svg {
      width: 2rem;
      height: 2rem;
    }

    h1 {
      margin: 0;
      color: #0f172a;
      font-size: 1.875rem;
      line-height: 2.25rem;
      font-weight: 700;
      letter-spacing: 0;
    }

    .login-header p {
      margin: 0.5rem 0 0;
      color: #475569;
      font-size: 1rem;
      line-height: 1.5rem;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .field-group label {
      display: block;
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .field-group input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      font-size: 1rem;
      line-height: 1.5rem;
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    .field-group input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .field-group input::placeholder {
      color: #64748b;
      opacity: 1;
    }

    .error-box {
      margin: 0;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    button {
      width: 100%;
      border: 0;
      background: #2563eb;
      color: #ffffff;
      font-weight: 600;
      font-size: 1rem;
      line-height: 1.5rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 200ms ease, opacity 200ms ease;
    }

    button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  async submit(): Promise<void> {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Ingresa correo y contraseña.';
      return;
    }

    try {
      this.loading = true;

      await this.authService.login({
        email: this.email.trim(),
        password: this.password
      });

      const isAdmin = await this.authService.isAdmin();

      if (!isAdmin) {
        await this.authService.logout();
        this.errorMessage = 'Tu cuenta no tiene acceso al backoffice.';
        return;
      }

      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesión.';
    } finally {
      this.loading = false;
    }
  }
}

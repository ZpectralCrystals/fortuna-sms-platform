import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';

@Component({
  selector: 'sms-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="login-page">
      <section class="login-card">
        <div class="login-card__intro">
          <div class="brand">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
            </svg>
            <div>
              <span>SMS Fortuna</span>
              <small>Comunicación masiva</small>
            </div>
          </div>

          <h1>Inicia sesión</h1>
          <p>
            ¿No tienes cuenta?
            <a routerLink="/register">Regístrate gratis</a>
          </p>
        </div>

        <form class="login-form" (ngSubmit)="submit()">
          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div class="fields">
            <label>
              <span>Correo electrónico</span>
              <input
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                autocomplete="email"
                placeholder="tu@empresa.com"
              />
            </label>

            <label>
              <span>Contraseña</span>
              <input
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
              />
            </label>
          </div>

          <div class="form-links">
            <a routerLink="/forgot-password">¿Olvidaste tu contraseña?</a>
          </div>

          <button type="submit" [disabled]="loading">
            {{ loading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
          </button>
        </form>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .login-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
      padding: 0 16px;
    }

    .login-card {
      display: grid;
      width: 100%;
      max-width: 448px;
      gap: 32px;
      border-radius: 16px;
      background: #ffffff;
      padding: 32px;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35);
    }

    .login-card__intro {
      text-align: center;
    }

    .brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .brand svg {
      width: 40px;
      height: 40px;
      color: #2563eb;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.5;
      flex: 0 0 auto;
    }

    .brand span,
    .brand small {
      display: block;
      text-align: left;
    }

    .brand span {
      color: #111827;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
    }

    .brand small {
      color: #6b7280;
      font-size: 12px;
      line-height: 1.2;
    }

    h1 {
      margin: 24px 0 0;
      color: #111827;
      font-size: 30px;
      font-weight: 700;
      line-height: 1.2;
    }

    .login-card__intro p {
      margin: 8px 0 0;
      color: #4b5563;
      font-size: 14px;
    }

    .login-card__intro a,
    .form-links a {
      color: #2563eb;
      font-weight: 500;
      transition: color 160ms ease;
    }

    .login-card__intro a:hover,
    .form-links a:hover {
      color: #3b82f6;
    }

    .login-form {
      display: grid;
      gap: 24px;
    }

    .error-message {
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: #fef2f2;
      color: #b91c1c;
      padding: 12px 16px;
    }

    .fields {
      display: grid;
      gap: 16px;
    }

    label {
      display: grid;
      gap: 4px;
    }

    label span {
      color: #374151;
      font-size: 14px;
      font-weight: 500;
    }

    input {
      width: 100%;
      appearance: none;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      color: #111827;
      font: inherit;
      padding: 12px;
      outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    input::placeholder {
      color: #6b7280;
    }

    input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .form-links {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
    }

    button {
      display: flex;
      justify-content: center;
      width: 100%;
      border: 1px solid transparent;
      border-radius: 8px;
      background: #2563eb;
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      padding: 12px 16px;
      transition: background 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
    }

    button:hover {
      background: #1d4ed8;
    }

    button:focus {
      box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #3b82f6;
      outline: none;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    @media (min-width: 640px) {
      .login-page {
        padding: 0 24px;
      }
    }

    @media (min-width: 1024px) {
      .login-page {
        padding: 0 32px;
      }
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

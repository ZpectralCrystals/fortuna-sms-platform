import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';

@Component({
  selector: 'sms-forgot-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="auth-card" aria-labelledby="forgot-password-title">
        <header class="auth-intro">
          <div class="brand">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
            </svg>
            <div>
              <span>SMS Fortuna</span>
              <small>Comunicación masiva</small>
            </div>
          </div>

          <h1 id="forgot-password-title">Recupera tu contraseña</h1>
          <p>
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </header>

        <form class="auth-form" (ngSubmit)="submit()">
          <p *ngIf="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </p>

          <p *ngIf="successMessage" class="alert alert-success">
            {{ successMessage }}
          </p>

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

          <button type="submit" [disabled]="loading">
            {{ loading ? 'Enviando...' : 'Enviar enlace' }}
          </button>
        </form>

        <footer class="auth-links">
          <a routerLink="/login">Volver a iniciar sesión</a>
          <span>¿No tienes cuenta? <a routerLink="/register">Regístrate gratis</a></span>
        </footer>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    :host *,
    :host *::before,
    :host *::after {
      box-sizing: border-box;
    }

    a {
      color: #2563eb;
      font-weight: 500;
      text-decoration: none;
      transition: color 160ms ease;
    }

    a:hover {
      color: #3b82f6;
    }

    .auth-page {
      align-items: center;
      background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
      display: flex;
      justify-content: center;
      min-height: 100vh;
      padding: 0 16px;
    }

    .auth-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35);
      display: grid;
      gap: 32px;
      max-width: 448px;
      padding: 32px;
      width: 100%;
    }

    .auth-intro {
      text-align: center;
    }

    .brand {
      align-items: center;
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .brand svg {
      color: #2563eb;
      fill: none;
      flex: 0 0 auto;
      height: 40px;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.5;
      width: 40px;
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
      color: #111827;
      font-size: 30px;
      font-weight: 700;
      line-height: 1.2;
      margin: 24px 0 0;
    }

    .auth-intro p {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.5;
      margin: 8px auto 0;
      max-width: 340px;
    }

    .auth-form {
      display: grid;
      gap: 24px;
    }

    label {
      display: grid;
      gap: 4px;
    }

    label span {
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
    }

    input {
      appearance: none;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      color: #111827;
      display: block;
      font: inherit;
      line-height: 24px;
      outline: none;
      padding: 12px;
      transition: border-color 160ms ease, box-shadow 160ms ease;
      width: 100%;
    }

    input::placeholder {
      color: #6b7280;
    }

    input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .alert {
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.45;
      margin: 0;
      padding: 12px 16px;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }

    .alert-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
    }

    button {
      align-items: center;
      background: #2563eb;
      border: 1px solid transparent;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      justify-content: center;
      line-height: 20px;
      padding: 12px 16px;
      transition: background-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
      width: 100%;
    }

    button:hover:not(:disabled) {
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

    .auth-links {
      color: #6b7280;
      display: grid;
      gap: 8px;
      font-size: 14px;
      line-height: 1.45;
      text-align: center;
    }

    @media (min-width: 640px) {
      .auth-page {
        padding: 0 24px;
      }
    }

    @media (min-width: 1024px) {
      .auth-page {
        padding: 0 32px;
      }
    }
  `]
})
export class ForgotPasswordPageComponent {
  private readonly authService = inject(AuthService);

  email = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email) {
      this.errorMessage = 'Ingresa tu correo electrónico.';
      return;
    }

    try {
      this.loading = true;

      await this.authService.forgotPassword(this.email.trim());

      this.successMessage = 'Si el correo existe, recibirás un enlace de recuperación.';
      this.email = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo enviar el enlace de recuperación.';
    } finally {
      this.loading = false;
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';

@Component({
  selector: 'sms-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="register-page">
      <section class="register-card" aria-labelledby="register-title">
        <header>
          <div class="brand-wrap">
            <div class="brand">
              <svg
                class="brand-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div>
                <span class="brand-name">SMS Fortuna</span>
                <span class="brand-subtitle">Comunicación masiva</span>
              </div>
            </div>
          </div>

          <h1 id="register-title">Crea tu cuenta</h1>
          <p class="login-copy">
            ¿Ya tienes cuenta?
            <a routerLink="/login">Inicia sesión</a>
          </p>
        </header>

        <div class="bonus-box">
          Obtén 10 SMS gratis al registrarte
        </div>

        <form class="register-form" (ngSubmit)="submit()">
          <p *ngIf="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </p>

          <p *ngIf="successMessage" class="alert alert-success">
            {{ successMessage }}
          </p>

          <div class="fields">
            <label>
              <span>Nombre completo</span>
              <input
                type="text"
                name="fullName"
                [(ngModel)]="fullName"
                required
                placeholder="Juan Pérez"
                autocomplete="name"
              />
            </label>

            <label>
              <span>Razón Social</span>
              <input
                type="text"
                name="companyName"
                [(ngModel)]="companyName"
                required
                placeholder="Mi Empresa S.A.C."
                autocomplete="organization"
              />
            </label>

            <label>
              <span>RUC</span>
              <input
                type="text"
                name="ruc"
                [(ngModel)]="ruc"
                required
                maxlength="11"
                placeholder="20123456789"
                inputmode="numeric"
                autocomplete="off"
              />
            </label>

            <label>
              <span>Teléfono celular</span>
              <input
                type="tel"
                name="phone"
                [(ngModel)]="phone"
                required
                maxlength="15"
                placeholder="999999999"
                inputmode="tel"
                autocomplete="tel"
              />
            </label>

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
                autocomplete="new-password"
                placeholder="••••••••"
              />
            </label>

            <label>
              <span>Confirmar contraseña</span>
              <input
                type="password"
                name="confirmPassword"
                [(ngModel)]="confirmPassword"
                required
                autocomplete="new-password"
                placeholder="••••••••"
              />
            </label>
          </div>

          <button
            class="submit-button"
            type="submit"
            [disabled]="loading"
          >
            {{ loading ? 'Creando cuenta...' : 'Crear cuenta' }}
          </button>

          <p class="legal-copy">
            Al registrarte, aceptas nuestros
            <a routerLink="/terms">Términos de Servicio</a>
            y
            <a routerLink="/privacy">Política de Privacidad</a>
          </p>
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

    :host *,
    :host *::before,
    :host *::after {
      box-sizing: border-box;
    }

    .register-page {
      align-items: center;
      background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
      display: flex;
      justify-content: center;
      min-height: 100vh;
      padding-left: 16px;
      padding-right: 16px;
    }

    .register-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35);
      max-width: 448px;
      padding: 32px;
      width: 100%;
    }

    .brand-wrap {
      display: flex;
      justify-content: center;
    }

    .brand {
      align-items: center;
      display: flex;
      gap: 8px;
    }

    .brand-icon {
      color: #2563eb;
      height: 40px;
      width: 40px;
    }

    .brand-name {
      color: #111827;
      display: block;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
    }

    .brand-subtitle {
      color: #6b7280;
      display: block;
      font-size: 12px;
      line-height: 1.25;
    }

    h1 {
      color: #111827;
      font-size: 30px;
      font-weight: 700;
      line-height: 1.2;
      margin: 24px 0 0;
      text-align: center;
    }

    .login-copy {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.45;
      margin: 8px 0 0;
      text-align: center;
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

    .bonus-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      color: #1e40af;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      margin-top: 32px;
      padding: 16px;
      text-align: center;
    }

    .register-form {
      margin-top: 32px;
    }

    .fields {
      display: grid;
      gap: 16px;
    }

    label {
      display: block;
    }

    label span {
      color: #374151;
      display: block;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      margin-bottom: 4px;
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
      padding: 12px;
      position: relative;
      width: 100%;
    }

    input::placeholder {
      color: #6b7280;
    }

    input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
      outline: none;
    }

    .alert {
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.45;
      margin: 0 0 24px;
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

    .submit-button {
      align-items: center;
      background: #2563eb;
      border: 1px solid transparent;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      font-size: 14px;
      font-weight: 500;
      justify-content: center;
      line-height: 20px;
      margin-top: 24px;
      padding: 12px 16px;
      transition: background-color 160ms ease, opacity 160ms ease;
      width: 100%;
    }

    .submit-button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .submit-button:focus {
      box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #3b82f6;
      outline: none;
    }

    .submit-button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .legal-copy {
      color: #6b7280;
      font-size: 12px;
      line-height: 16px;
      margin: 24px 0 0;
      text-align: center;
    }

    @media (min-width: 640px) {
      .register-page {
        padding-left: 24px;
        padding-right: 24px;
      }
    }

    @media (min-width: 1024px) {
      .register-page {
        padding-left: 32px;
        padding-right: 32px;
      }
    }
  `]
})
export class RegisterPageComponent {
  private readonly authService = inject(AuthService);

  fullName = '';
  companyName = '';
  ruc = '';
  phone = '';
  email = '';
  password = '';
  confirmPassword = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (
      !this.fullName ||
      !this.companyName ||
      !this.ruc ||
      !this.phone ||
      !this.email ||
      !this.password ||
      !this.confirmPassword
    ) {
      this.errorMessage = 'Completa todos los campos.';
      return;
    }

    if (!/^\d{11}$/.test(this.ruc.trim())) {
      this.errorMessage = 'El RUC debe tener 11 dígitos.';
      return;
    }

    if (!this.isValidPeruPhone(this.phone)) {
      this.errorMessage = 'El teléfono celular debe tener un formato válido para Perú.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    try {
      this.loading = true;

      await this.authService.register({
        email: this.email.trim(),
        password: this.password,
        fullName: this.fullName.trim(),
        companyName: this.companyName.trim(),
        ruc: this.ruc.trim(),
        phone: this.normalizePeruPhone(this.phone)
      });

      this.successMessage = 'Cuenta creada correctamente. Ahora puedes iniciar sesión.';
      this.fullName = '';
      this.companyName = '';
      this.ruc = '';
      this.phone = '';
      this.email = '';
      this.password = '';
      this.confirmPassword = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo crear la cuenta.';
    } finally {
      this.loading = false;
    }
  }

  private isValidPeruPhone(phone: string): boolean {
    return /^(?:\+?51)?9\d{8}$/.test(this.normalizePeruPhone(phone));
  }

  private normalizePeruPhone(phone: string): string {
    return phone.replace(/[\s-]/g, '').trim();
  }
}

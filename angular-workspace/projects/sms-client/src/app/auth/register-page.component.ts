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
    <main class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <section class="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 class="text-2xl font-bold text-slate-900">Crear cuenta</h1>
        <p class="mt-2 text-sm text-slate-600">
          Registra tu empresa para usar SMS Fortuna.
        </p>

        <form class="mt-6 space-y-4" (ngSubmit)="submit()">
          <div>
            <label class="block text-sm font-medium text-slate-700">
              Razón social
            </label>
            <input
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              type="text"
              name="companyName"
              [(ngModel)]="companyName"
              required
              placeholder="Mi Empresa SAC"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700">
              RUC
            </label>
            <input
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              type="text"
              name="ruc"
              [(ngModel)]="ruc"
              required
              maxlength="11"
              placeholder="20123456789"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              type="email"
              name="email"
              [(ngModel)]="email"
              required
              autocomplete="email"
              placeholder="cliente@empresa.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              autocomplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <p *ngIf="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ errorMessage }}
          </p>

          <p *ngIf="successMessage" class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {{ successMessage }}
          </p>

          <button
            class="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-60"
            type="submit"
            [disabled]="loading"
          >
            {{ loading ? 'Creando cuenta...' : 'Crear cuenta' }}
          </button>
        </form>

        <div class="mt-4 text-sm">
          <a class="text-slate-700 underline" routerLink="/login">
            Ya tengo cuenta
          </a>
        </div>
      </section>
    </main>
  `
})
export class RegisterPageComponent {
  private readonly authService = inject(AuthService);

  companyName = '';
  ruc = '';
  email = '';
  password = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.companyName || !this.ruc || !this.email || !this.password) {
      this.errorMessage = 'Completa todos los campos.';
      return;
    }

    if (this.ruc.length !== 11) {
      this.errorMessage = 'El RUC debe tener 11 dígitos.';
      return;
    }

    try {
      this.loading = true;

      await this.authService.register({
        email: this.email.trim(),
        password: this.password,
        companyName: this.companyName.trim(),
        ruc: this.ruc.trim()
      });

      this.successMessage = 'Cuenta creada correctamente. Ahora puedes iniciar sesión.';
      this.companyName = '';
      this.ruc = '';
      this.email = '';
      this.password = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo crear la cuenta.';
    } finally {
      this.loading = false;
    }
  }
}
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
    <main class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <section class="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 class="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>

        <p class="mt-2 text-sm text-slate-600">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form class="mt-6 space-y-4" (ngSubmit)="submit()">
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
            {{ loading ? 'Enviando...' : 'Enviar enlace' }}
          </button>
        </form>

        <div class="mt-4 text-sm">
          <a class="text-slate-700 underline" routerLink="/login">
            Volver al login
          </a>
        </div>
      </section>
    </main>
  `
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
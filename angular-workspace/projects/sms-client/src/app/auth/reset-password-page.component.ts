import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';

@Component({
  selector: 'sms-reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <section class="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 class="text-2xl font-bold text-slate-900">Nueva contraseña</h1>

        <p class="mt-2 text-sm text-slate-600">
          Ingresa tu nueva contraseña para recuperar el acceso.
        </p>

        <form class="mt-6 space-y-4" (ngSubmit)="submit()">
          <div>
            <label class="block text-sm font-medium text-slate-700">
              Nueva contraseña
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

          <div>
            <label class="block text-sm font-medium text-slate-700">
              Confirmar contraseña
            </label>
            <input
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              type="password"
              name="confirmPassword"
              [(ngModel)]="confirmPassword"
              required
              autocomplete="new-password"
              placeholder="Repite la contraseña"
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
            {{ loading ? 'Actualizando...' : 'Actualizar contraseña' }}
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
export class ResetPasswordPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  password = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.password || !this.confirmPassword) {
      this.errorMessage = 'Completa ambos campos.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener mínimo 6 caracteres.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    try {
      this.loading = true;

      await this.authService.resetPassword(this.password);

      this.successMessage = 'Contraseña actualizada correctamente. Redirigiendo al login...';

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1200);
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la contraseña.';
    } finally {
      this.loading = false;
    }
  }
}
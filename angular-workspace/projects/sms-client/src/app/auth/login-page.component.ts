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
    <main class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <section class="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 class="text-2xl font-bold text-slate-900">Ingresar</h1>
        <p class="mt-2 text-sm text-slate-600">
          Accede a tu cuenta de SMS Fortuna.
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
              placeholder="cliente@test.com"
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
              autocomplete="current-password"
              placeholder="Tu contraseña"
            />
          </div>

          <p *ngIf="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ errorMessage }}
          </p>

          <button
            class="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-60"
            type="submit"
            [disabled]="loading"
          >
            {{ loading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>

        <div class="mt-4 flex items-center justify-between text-sm">
          <a class="text-slate-700 underline" routerLink="/forgot-password">
            Recuperar contraseña
          </a>

          <a class="text-slate-700 underline" routerLink="/register">
            Crear cuenta
          </a>
        </div>
      </section>
    </main>
  `
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
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';

@Component({
  selector: 'bo-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
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

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AccountDeactivatedError, AuthService } from '@sms-fortuna/shared';

const SUPPORT_WHATSAPP_URL = `https://wa.me/51982165728?text=${encodeURIComponent(
  'Hola, necesito soporte técnico con mi cuenta SMS Fortuna.'
)}`;

@Component({
  selector: 'sms-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
  deactivatedAccount = false;
  readonly supportWhatsAppUrl = SUPPORT_WHATSAPP_URL;

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.deactivatedAccount = false;

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

      const session = await this.authService.getCurrentSessionInfo('login-post-signin');
      const isAdmin = await this.authService.isAdmin('login-post-signin');
      const target = isAdmin ? '/admin/dashboard' : '/dashboard';

      console.info('[SMS Fortuna Auth]', 'LOGIN_ROUTE', {
        userId: session?.userId ?? null,
        email: session?.email ?? this.email.trim(),
        isAdmin,
        target
      });

      await this.router.navigate([target]);
    } catch (error) {
      if (error instanceof AccountDeactivatedError) {
        this.deactivatedAccount = true;
        return;
      }

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesión.';
    } finally {
      this.loading = false;
    }
  }
}

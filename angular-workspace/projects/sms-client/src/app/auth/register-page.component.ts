import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../shared/src/lib/services/auth.service';

@Component({
  selector: 'sms-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss'
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

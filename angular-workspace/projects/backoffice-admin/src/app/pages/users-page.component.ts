import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackofficeClientProfile, BackofficeService } from '@sms-fortuna/shared';

interface BackofficeUserRow {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  sms_balance: number;
  is_active: boolean;
}

@Component({
  selector: 'bo-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss'
})
export class UsersPageComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  users: BackofficeUserRow[] = [];
  loading = true;
  searchTerm = '';
  errorMessage = '';
  successMessage = '';
  updatingUserId: string | null = null;

  get filteredUsers(): BackofficeUserRow[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.users;
    }

    return this.users.filter((user) =>
      (user.full_name ?? '').toLowerCase().includes(search) ||
      (user.email ?? '').toLowerCase().includes(search) ||
      (user.company ?? '').toLowerCase().includes(search) ||
      (user.phone ?? '').toLowerCase().includes(search)
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const profiles = await this.backofficeService.listClients();
      this.users = profiles.map((profile) => this.mapUser(profile));
    } catch (error) {
      console.warn('Error loading profile users:', error);
      this.users = [];
      this.errorMessage = 'No se pudieron cargar los usuarios';
    } finally {
      this.loading = false;
    }
  }

  async toggleUserStatus(user: BackofficeUserRow): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.updatingUserId = user.id;

    try {
      await this.backofficeService.setClientActive(user.id, !user.is_active);
      this.successMessage = user.is_active
        ? 'Usuario desactivado correctamente.'
        : 'Usuario activado correctamente.';
      await this.loadUsers();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cambiar el estado del usuario.';
    } finally {
      this.updatingUserId = null;
    }
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }

  private mapUser(profile: BackofficeClientProfile): BackofficeUserRow {
    return {
      id: profile.id,
      email: profile.email || '-',
      full_name: profile.full_name,
      company: profile.razon_social || profile.ruc || null,
      phone: profile.phone,
      sms_balance: Number(profile.credits ?? 0),
      is_active: Boolean(profile.is_active)
    };
  }
}

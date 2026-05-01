import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from '../../../../shared/src/lib/services/supabase.service';

interface BackofficeUser {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  phone: string | null;
  sms_balance: number;
  is_active: boolean;
  created_at: string | null;
}

@Component({
  selector: 'bo-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss'
})
export class UsersPageComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  users: BackofficeUser[] = [];
  loading = true;
  searchTerm = '';
  showAddModal = false;
  message = '';
  newUser = {
    email: '',
    full_name: '',
    company: '',
    phone: ''
  };

  get filteredUsers(): BackofficeUser[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.users;
    }

    return this.users.filter((user) =>
      (user.full_name ?? '').toLowerCase().includes(search) ||
      (user.email ?? '').toLowerCase().includes(search) ||
      (user.company ?? '').toLowerCase().includes(search)
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;

    try {
      const { data, error } = await this.supabaseService.instance
        .from('users')
        .select('id, email, full_name, company, phone, sms_balance, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.users = (data ?? []).map((user: any) => ({
        id: String(user.id ?? ''),
        email: String(user.email ?? ''),
        full_name: String(user.full_name ?? ''),
        company: typeof user.company === 'string' ? user.company : null,
        phone: typeof user.phone === 'string' ? user.phone : null,
        sms_balance: Number(user.sms_balance ?? 0),
        is_active: Boolean(user.is_active ?? false),
        created_at: typeof user.created_at === 'string' ? user.created_at : null
      }));
    } catch (error) {
      console.warn('Error loading users:', error);
      this.users = [];
    } finally {
      this.loading = false;
    }
  }

  openAddModal(): void {
    this.message = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  handleAddUser(): void {
    this.message = 'La creación segura de usuarios se conectará en la siguiente fase.';
    this.showAddModal = false;
    this.newUser = { email: '', full_name: '', company: '', phone: '' };
  }

  showActivationNotice(): void {
    this.message = 'La activación de usuarios se conectará en la siguiente fase.';
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }
}

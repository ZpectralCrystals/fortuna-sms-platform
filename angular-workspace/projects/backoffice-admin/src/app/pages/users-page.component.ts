import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from '../../../../shared/src/lib/services/supabase.service';

interface BackofficeClientProfile {
  id: string;
  email: string;
  full_name: string;
  razon_social: string;
  ruc: string;
  company: string;
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

  users: BackofficeClientProfile[] = [];
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

  get filteredUsers(): BackofficeClientProfile[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.users;
    }

    return this.users.filter((user) =>
      (user.full_name ?? '').toLowerCase().includes(search) ||
      (user.email ?? '').toLowerCase().includes(search) ||
      user.company.toLowerCase().includes(search) ||
      user.razon_social.toLowerCase().includes(search) ||
      user.ruc.toLowerCase().includes(search)
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;

    try {
      const adminIds = await this.loadAdminIds();
      const currentUserId = await this.getCurrentUserId();
      const { data, error } = await this.supabaseService.instance
        .from('profiles')
        .select('id,email,full_name,razon_social,ruc,phone,is_active,credits,created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.users = (data ?? [])
        .filter((profile: any) => {
          const id = String(profile.id ?? '');
          return id && !adminIds.has(id) && id !== currentUserId;
        })
        .map((profile: any) => {
          const razonSocial = this.toSafeString(profile.razon_social);
          const ruc = this.toSafeString(profile.ruc);

          return {
            id: String(profile.id ?? ''),
            email: this.toSafeString(profile.email),
            full_name: this.toSafeString(profile.full_name),
            razon_social: razonSocial,
            ruc,
            company: razonSocial || ruc || '-',
            phone: this.toNullableString(profile.phone),
            sms_balance: Number(profile.credits ?? 0),
            is_active: Boolean(profile.is_active ?? false),
            created_at: typeof profile.created_at === 'string' ? profile.created_at : null
          };
        });
    } catch (error) {
      console.warn('Error loading profile users:', error);
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

  private async loadAdminIds(): Promise<Set<string>> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('admins')
        .select('id');

      if (error) {
        throw error;
      }

      return new Set((data ?? []).map((admin: any) => String(admin.id ?? '')).filter(Boolean));
    } catch (error) {
      console.warn('Error loading profile user admins:', error);
      return new Set();
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data, error } = await this.supabaseService.instance.auth.getSession();

      if (error) {
        throw error;
      }

      return data.session?.user?.id ?? null;
    } catch (error) {
      console.warn('Error loading current profile user:', error);
      return null;
    }
  }

  private toSafeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}

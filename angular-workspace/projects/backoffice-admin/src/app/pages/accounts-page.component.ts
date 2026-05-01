import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from '../../../../shared/src/lib/services/supabase.service';

type RechargeStatus = 'pending' | 'approved' | 'rejected';

interface ClientRecharge {
  id: string;
  user_id: string;
  quantity: number;
  amount: number;
  status: RechargeStatus;
  created_at: string;
}

interface ClientDetails {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  razon_social: string;
  ruc: string;
  phone: string | null;
  sms_balance: number;
  is_active: boolean;
  created_at: string;
  totalRecharges: number;
  totalSpent: number;
  recentRecharges: ClientRecharge[];
}

@Component({
  selector: 'bo-accounts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts-page.component.html',
  styleUrl: './accounts-page.component.scss'
})
export class AccountsPageComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  clients: ClientDetails[] = [];
  loading = true;
  searchTerm = '';
  selectedClient: ClientDetails | null = null;

  get filteredClients(): ClientDetails[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.clients;
    }

    return this.clients.filter((client) =>
      (client.full_name ?? '').toLowerCase().includes(search) ||
      (client.email ?? '').toLowerCase().includes(search) ||
      (client.razon_social ?? '').toLowerCase().includes(search) ||
      (client.ruc ?? '').toLowerCase().includes(search) ||
      (client.company ?? '').toLowerCase().includes(search)
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadClients();
  }

  async loadClients(): Promise<void> {
    this.loading = true;

    try {
      const profiles = await this.loadProfiles();
      const adminIds = await this.loadAdminIds();
      const currentUserId = await this.getCurrentUserId();

      this.clients = profiles
        .filter((profile) => {
          const isAdminByTable = adminIds.has(profile.id);
          const isCurrentAdmin = currentUserId ? profile.id === currentUserId : false;

          return !isAdminByTable && !isCurrentAdmin;
        })
        .map((profile) => ({
          ...profile,
          totalRecharges: 0,
          totalSpent: profile.totalSpent,
          recentRecharges: []
        }));
    } catch (error) {
      console.warn('Error loading clients:', error);
      this.clients = [];
    } finally {
      this.loading = false;
    }
  }

  openClient(client: ClientDetails): void {
    this.selectedClient = client;
  }

  closeClient(): void {
    this.selectedClient = null;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  statusLabel(status: RechargeStatus): string {
    const labels: Record<RechargeStatus, string> = {
      approved: 'Aprobado',
      pending: 'Pendiente',
      rejected: 'Rechazado'
    };

    return labels[status];
  }

  private async loadProfiles(): Promise<Omit<ClientDetails, 'totalRecharges' | 'recentRecharges'>[]> {
    try {
      const { data, error } = await this.supabaseService.instance
        .from('profiles')
        .select('id,email,full_name,razon_social,ruc,phone,role,is_active,credits,total_spent,created_at,updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((profile: any) => {
        const email = this.toSafeString(profile.email);
        const fullName = this.toSafeString(profile.full_name) || email;
        const razonSocial = this.toSafeString(profile.razon_social);
        const ruc = this.toSafeString(profile.ruc);
        const company = razonSocial || ruc || '-';

        return {
          id: String(profile.id ?? ''),
          email,
          full_name: fullName,
          razon_social: razonSocial,
          ruc,
          company,
          phone: this.toNullableString(profile.phone),
          sms_balance: Number(profile.credits ?? 0),
          is_active: profile.is_active ?? true,
          created_at: typeof profile.created_at === 'string' ? profile.created_at : new Date().toISOString(),
          totalSpent: Number(profile.total_spent ?? 0)
        };
      });
    } catch (error) {
      console.warn('Error loading account profiles:', error);
      return [];
    }
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
      console.warn('Error loading account admins:', error);
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
      console.warn('Error loading current account user:', error);
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

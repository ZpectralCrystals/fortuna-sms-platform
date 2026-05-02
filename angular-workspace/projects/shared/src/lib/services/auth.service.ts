import { Injectable, inject } from '@angular/core';
import { LoginRequest, RegisterRequest } from '../models/auth.model';
import { SupabaseService } from './supabase.service';

export interface AuthProfile {
  id: string;
  email: string;
  full_name: string | null;
  razon_social: string | null;
  ruc: string | null;
  phone: string | null;
  is_active: boolean;
  credits: number;
  total_spent: number;
  created_at: string;
  updated_at: string | null;
}

export interface AuthAdmin {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  async login(request: LoginRequest): Promise<void> {
    const { error } = await this.supabase.instance.auth.signInWithPassword({
      email: request.email,
      password: request.password
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async register(request: RegisterRequest): Promise<void> {
    const { error } = await this.supabase.instance.auth.signUp({
      email: request.email,
      password: request.password,
      options: {
        data: {
          full_name: request.fullName ?? null,
          razon_social: request.companyName ?? null,
          company_name: request.companyName ?? null,
          ruc: request.ruc ?? null,
          phone: request.phone ?? null
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const { error } = await this.supabase.instance.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        throw new Error('Has solicitado demasiados correos en poco tiempo. Intenta nuevamente en unos minutos.');
      }

      throw new Error(error.message);
    }
  }

  async resetPassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.instance.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.instance.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const { data, error } = await this.supabase.instance.auth.getSession();

    if (error) {
      return false;
    }

    return !!data.session;
  }

  async getCurrentProfile(): Promise<AuthProfile | null> {
    const userId = await this.getSessionUserId();

    if (!userId) {
      return null;
    }

    const { data, error } = await this.supabase.instance
      .from('profiles')
      .select('id,email,full_name,razon_social,ruc,phone,is_active,credits,total_spent,created_at,updated_at')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: String(data.id ?? ''),
      email: String(data.email ?? ''),
      full_name: typeof data.full_name === 'string' ? data.full_name : null,
      razon_social: typeof data.razon_social === 'string' ? data.razon_social : null,
      ruc: typeof data.ruc === 'string' ? data.ruc : null,
      phone: typeof data.phone === 'string' ? data.phone : null,
      is_active: Boolean(data.is_active),
      credits: Number(data.credits ?? 0),
      total_spent: Number(data.total_spent ?? 0),
      created_at: typeof data.created_at === 'string' ? data.created_at : '',
      updated_at: typeof data.updated_at === 'string' ? data.updated_at : null
    };
  }

  async hasClientProfile(): Promise<boolean> {
    return !!(await this.getCurrentProfile());
  }

  async getCurrentAdmin(): Promise<AuthAdmin | null> {
    const userId = await this.getSessionUserId();

    if (!userId) {
      return null;
    }

    const { data, error } = await this.supabase.instance
      .from('admins')
      .select('id,email,full_name,is_active,created_at,updated_at')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: String(data.id ?? ''),
      email: String(data.email ?? ''),
      full_name: typeof data.full_name === 'string' ? data.full_name : null,
      is_active: Boolean(data.is_active),
      created_at: typeof data.created_at === 'string' ? data.created_at : '',
      updated_at: typeof data.updated_at === 'string' ? data.updated_at : null
    };
  }

  async isAdmin(): Promise<boolean> {
    return !!(await this.getCurrentAdmin());
  }

  private async getSessionUserId(): Promise<string | null> {
    const { data, error } = await this.supabase.instance.auth.getSession();

    if (error || !data.session?.user) {
      return null;
    }

    return data.session.user.id;
  }
}

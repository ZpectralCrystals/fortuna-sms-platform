import { Injectable, inject } from '@angular/core';
import { LoginRequest, RegisterRequest } from '../models/auth.model';
import { SupabaseService } from './supabase.service';

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
          razon_social: request.companyName ?? null,
          ruc: request.ruc ?? null
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

  async isAdmin(): Promise<boolean> {
    const { data: sessionData, error: sessionError } =
      await this.supabase.instance.auth.getSession();

    if (sessionError || !sessionData.session?.user) {
      return false;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await this.supabase.instance
      .from('admins')
      .select('id, is_active')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return false;
    }

    return !!data;
  }

  
}
import { Injectable, inject } from '@angular/core';
import { Session } from '@supabase/supabase-js';
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

export class AccountDeactivatedError extends Error {
  constructor() {
    super('ACCOUNT_DEACTIVATED');
    this.name = 'AccountDeactivatedError';
  }
}

export interface AuthSessionInfo {
  userId: string;
  email: string | null;
}

const AUTH_DEBUG_PREFIX = '[SMS Fortuna Auth]';
const SESSION_RETRY_ATTEMPTS = 5;
const SESSION_RETRY_DELAY_MS = 120;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  async login(request: LoginRequest): Promise<void> {
    const { data, error } = await this.supabase.instance.auth.signInWithPassword({
      email: request.email,
      password: request.password
    });

    if (error) {
      this.logAuth('LOGIN_ERROR', {
        email: request.email,
        error: error.message
      });
      throw new Error(this.mapAuthError(error.message));
    }

    const userId = data.user?.id;
    this.logAuth('LOGIN_SUCCESS', {
      userId: userId ?? null,
      email: data.user?.email ?? request.email
    });

    if (!userId) {
      return;
    }

    const { data: profile, error: profileError } = await this.supabase.instance
      .from('profiles')
      .select('id,is_active')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      this.logAuth('LOGIN_PROFILE_ERROR', {
        userId,
        email: data.user?.email ?? request.email,
        error: profileError.message
      });
      await this.supabase.instance.auth.signOut();
      throw new Error('No se pudo validar el estado de tu cuenta.');
    }

    if (profile && profile.is_active === false) {
      this.logAuth('LOGIN_PROFILE_INACTIVE', {
        userId,
        email: data.user?.email ?? request.email
      });
      await this.supabase.instance.auth.signOut();
      throw new AccountDeactivatedError();
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
      throw new Error(this.mapAuthError(error.message));
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
    const session = await this.getSessionWithRetry('isAuthenticated');

    return !!session;
  }

  async getCurrentProfile(): Promise<AuthProfile | null> {
    const session = await this.getSessionWithRetry('getCurrentProfile');
    const userId = session?.user.id ?? null;

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

  async getCurrentAdmin(context = 'getCurrentAdmin'): Promise<AuthAdmin | null> {
    const session = await this.getSessionWithRetry(context);
    const userId = session?.user.id ?? null;
    const email = session?.user.email ?? null;

    if (!userId) {
      this.logAuth('ADMIN_SESSION_MISSING', { context });
      return null;
    }

    const { data, error } = await this.supabase.instance
      .from('admins')
      .select('id,email,full_name,is_active,created_at,updated_at')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      this.logAuth('ADMIN_LOOKUP_RESULT', {
        context,
        userId,
        email,
        isAdmin: false,
        error: error?.message ?? null
      });
      return null;
    }

    this.logAuth('ADMIN_LOOKUP_RESULT', {
      context,
      userId,
      email,
      adminEmail: String(data.email ?? ''),
      isAdmin: true,
      error: null
    });

    return {
      id: String(data.id ?? ''),
      email: String(data.email ?? ''),
      full_name: typeof data.full_name === 'string' ? data.full_name : null,
      is_active: Boolean(data.is_active),
      created_at: typeof data.created_at === 'string' ? data.created_at : '',
      updated_at: typeof data.updated_at === 'string' ? data.updated_at : null
    };
  }

  async isAdmin(context = 'isAdmin'): Promise<boolean> {
    const admin = await this.getCurrentAdmin(context);
    const result = !!admin;

    this.logAuth('IS_ADMIN_RESULT', {
      context,
      isAdmin: result,
      adminEmail: admin?.email ?? null
    });

    return result;
  }

  async getCurrentSessionInfo(context = 'getCurrentSessionInfo'): Promise<AuthSessionInfo | null> {
    const session = await this.getSessionWithRetry(context);

    if (!session?.user) {
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email ?? null
    };
  }

  private async getSessionWithRetry(context: string): Promise<Session | null> {
    for (let attempt = 1; attempt <= SESSION_RETRY_ATTEMPTS; attempt += 1) {
      const { data, error } = await this.supabase.instance.auth.getSession();

      this.logAuth('SESSION_CHECK', {
        context,
        attempt,
        userId: data.session?.user?.id ?? null,
        email: data.session?.user?.email ?? null,
        hasSession: !!data.session,
        error: error?.message ?? null
      });

      if (error) {
        return null;
      }

      if (data.session?.user) {
        return data.session;
      }

      if (attempt < SESSION_RETRY_ATTEMPTS) {
        await this.delay(SESSION_RETRY_DELAY_MS);
      }
    }

    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private logAuth(stage: string, payload: Record<string, unknown>): void {
    console.info(AUTH_DEBUG_PREFIX, stage, payload);
  }

  private mapAuthError(message: string): string {
    const normalized = message.toLowerCase();

    if (
      normalized.includes('already registered') ||
      normalized.includes('already been registered') ||
      normalized.includes('user already registered') ||
      normalized.includes('email address is already')
    ) {
      return 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.';
    }

    if (
      normalized.includes('password') &&
      (normalized.includes('weak') || normalized.includes('short') || normalized.includes('6 characters'))
    ) {
      return 'La contraseña es demasiado débil. Usa al menos 6 caracteres.';
    }

    if (normalized.includes('rate limit') || normalized.includes('too many')) {
      return 'Has intentado demasiadas veces. Espera unos minutos y vuelve a intentar.';
    }

    if (normalized.includes('invalid login credentials')) {
      return 'Correo o contraseña incorrectos.';
    }

    if (normalized.includes('email not confirmed') || normalized.includes('not confirmed')) {
      return 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada o spam.';
    }

    if (normalized.includes('invalid email') || normalized.includes('email')) {
      return 'Ingresa un correo electrónico válido.';
    }

    return message;
  }
}

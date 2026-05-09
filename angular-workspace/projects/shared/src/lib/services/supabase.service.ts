import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface SupabaseGlobalState {
  client?: SupabaseClient;
  url?: string;
  anonKey?: string;
}

const SUPABASE_GLOBAL_KEY = '__smsFortunaSupabaseClient__';

function getSupabaseGlobalState(): SupabaseGlobalState {
  const scope = globalThis as typeof globalThis & {
    [SUPABASE_GLOBAL_KEY]?: SupabaseGlobalState;
  };

  scope[SUPABASE_GLOBAL_KEY] ??= {};

  return scope[SUPABASE_GLOBAL_KEY];
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client?: SupabaseClient;

  configure(config: SupabaseConfig): void {
    const state = getSupabaseGlobalState();

    if (state.client) {
      if (state.url !== config.url || state.anonKey !== config.anonKey) {
        throw new Error('Supabase client already configured with different credentials');
      }

      this.client = state.client;
      return;
    }

    state.client = createClient(config.url, config.anonKey);
    state.url = config.url;
    state.anonKey = config.anonKey;
    this.client = state.client;
  }

  get instance(): SupabaseClient {
    if (!this.client) {
      const state = getSupabaseGlobalState();

      if (state.client) {
        this.client = state.client;
      }
    }

    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    return this.client;
  }
}

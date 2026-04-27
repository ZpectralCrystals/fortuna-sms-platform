import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client?: SupabaseClient;

  configure(config: SupabaseConfig): void {
    this.client = createClient(config.url, config.anonKey);
  }

  get instance(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    return this.client;
  }
}

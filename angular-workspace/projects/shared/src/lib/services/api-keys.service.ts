import { Injectable } from '@angular/core';
import { ApiKey } from '../models/api-key.model';

@Injectable({ providedIn: 'root' })
export class ApiKeysService {
  async list(): Promise<ApiKey[]> {
    // TODO: load API keys.
    return [];
  }

  async create(_name: string): Promise<ApiKey | null> {
    // TODO: create API key through server-side flow.
    return null;
  }

  async revoke(_id: string): Promise<void> {
    // TODO: revoke API key.
  }
}

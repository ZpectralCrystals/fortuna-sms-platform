import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CreditsService {
  async getBalance(): Promise<number> {
    // TODO: load current user credits.
    return 0;
  }

  async refreshBalance(): Promise<number> {
    // TODO: refresh balance after send/recharge.
    return 0;
  }
}

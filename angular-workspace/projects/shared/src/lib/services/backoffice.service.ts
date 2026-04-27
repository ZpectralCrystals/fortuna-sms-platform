import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BackofficeService {
  async getDashboardStats(): Promise<unknown> {
    // TODO: load operational dashboard stats.
    return null;
  }

  async syncUsers(): Promise<void> {
    // TODO: trigger users synchronization.
  }

  async syncPackages(): Promise<void> {
    // TODO: trigger packages synchronization.
  }

  async sendLowBalanceAlerts(): Promise<void> {
    // TODO: trigger low balance alerts.
  }
}

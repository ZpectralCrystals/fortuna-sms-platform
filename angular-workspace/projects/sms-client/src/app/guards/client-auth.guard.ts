import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { AuthService } from '@sms-fortuna/shared';

@Injectable({ providedIn: 'root' })
export class ClientAuthGuard implements CanActivate, CanActivateChild {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async canActivate(): Promise<boolean | UrlTree> {
    return this.checkAccess();
  }

  async canActivateChild(): Promise<boolean | UrlTree> {
    return this.checkAccess();
  }

  private async checkAccess(): Promise<boolean | UrlTree> {
    const hasClientProfile = await this.auth.hasClientProfile();
    return hasClientProfile ? true : this.router.createUrlTree(['/login']);
  }
}

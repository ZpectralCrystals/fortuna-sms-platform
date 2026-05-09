import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { AuthService } from '@sms-fortuna/shared';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate, CanActivateChild {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    return this.checkAccess(state.url);
  }

  async canActivateChild(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    return this.checkAccess(state.url);
  }

  private async checkAccess(targetUrl: string): Promise<boolean | UrlTree> {
    const session = await this.auth.getCurrentSessionInfo('AdminGuard');

    if (!session) {
      console.info('[SMS Fortuna Auth]', 'ADMIN_GUARD_RESULT', {
        targetUrl,
        userId: null,
        email: null,
        isAdmin: false,
        redirect: '/login'
      });
      return this.router.createUrlTree(['/login']);
    }

    const isAdmin = await this.auth.isAdmin('AdminGuard');
    const redirect = isAdmin ? null : '/dashboard';

    console.info('[SMS Fortuna Auth]', 'ADMIN_GUARD_RESULT', {
      targetUrl,
      userId: session.userId,
      email: session.email,
      isAdmin,
      redirect
    });

    return isAdmin ? true : this.router.createUrlTree(['/dashboard']);
  }
}

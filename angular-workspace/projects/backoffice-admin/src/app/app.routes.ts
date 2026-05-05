import { Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';
import { LoginPageComponent } from './auth/login-page.component';
import { AdminLayoutComponent } from './layouts/admin-layout.component';
import { AccountsPageComponent } from './pages/accounts-page.component';
import { AlertsPageComponent } from './pages/alerts-page.component';
import { ApiKeysPageComponent } from './pages/api-keys-page.component';
import { DashboardPageComponent } from './pages/dashboard-page.component';
import { InvoicesPageComponent } from './pages/invoices-page.component';
import { MarketingPageComponent } from './pages/marketing-page.component';
import { MessagesPageComponent } from './pages/messages-page.component';
import { RechargesPageComponent } from './pages/recharges-page.component';
import { UsersPageComponent } from './pages/users-page.component';

export const backofficeAdminRoutes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],
    canActivateChild: [AdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'users', component: UsersPageComponent },
      { path: 'recharges', component: RechargesPageComponent },
      { path: 'accounts', component: AccountsPageComponent },
      { path: 'messages', component: MessagesPageComponent },
      { path: 'api-keys', component: ApiKeysPageComponent },
      { path: 'alerts', component: AlertsPageComponent },
      { path: 'invoices', component: InvoicesPageComponent },
      { path: 'marketing', component: MarketingPageComponent },
      { path: 'sync', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'integration-kit', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

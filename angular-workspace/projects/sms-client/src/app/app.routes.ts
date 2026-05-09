import { Routes } from '@angular/router';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { AdminGuard } from './admin/guards/admin.guard';
import { HomePageComponent } from './public/home-page.component';
import { LoginPageComponent } from './auth/login-page.component';

export const smsClientRoutes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'login', component: LoginPageComponent },
  {
    path: 'register',
    loadComponent: () =>
      import('./auth/register-page.component').then(m => m.RegisterPageComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./auth/forgot-password-page.component').then(m => m.ForgotPasswordPageComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./auth/reset-password-page.component').then(m => m.ResetPasswordPageComponent)
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./public/about-page.component').then(m => m.AboutPageComponent)
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./public/blog-page.component').then(m => m.BlogPageComponent)
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./public/blog-post-page.component').then(m => m.BlogPostPageComponent)
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./public/privacy-page.component').then(m => m.PrivacyPageComponent)
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./public/terms-page.component').then(m => m.TermsPageComponent)
  },
  {
    path: 'dashboard',
    canActivate: [ClientAuthGuard],
    canActivateChild: [ClientAuthGuard],
    loadComponent: () =>
      import('./layouts/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard/pages/dashboard-overview-page.component').then(
            m => m.DashboardOverviewPageComponent
          )
      },
      {
        path: 'send',
        loadComponent: () =>
          import('./dashboard/pages/send-sms-page.component').then(m => m.SendSmsPageComponent)
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./dashboard/pages/history-page.component').then(m => m.HistoryPageComponent)
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./dashboard/pages/analytics-page.component').then(m => m.AnalyticsPageComponent)
      },
      {
        path: 'templates',
        loadComponent: () =>
          import('./dashboard/pages/templates-page.component').then(m => m.TemplatesPageComponent)
      },
      {
        path: 'api-keys',
        loadComponent: () =>
          import('./dashboard/pages/api-keys-page.component').then(m => m.ApiKeysPageComponent)
      },
      {
        path: 'recharges',
        loadComponent: () =>
          import('./dashboard/pages/recharges-page.component').then(m => m.RechargesPageComponent)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [AdminGuard],
    canActivateChild: [AdminGuard],
    loadComponent: () =>
      import('./admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin/pages/dashboard-page.component').then(m => m.DashboardPageComponent)
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./admin/pages/users-page.component').then(m => m.UsersPageComponent)
      },
      {
        path: 'recharges',
        loadComponent: () =>
          import('./admin/pages/recharges-page.component').then(m => m.RechargesPageComponent)
      },
      { path: 'inventory', redirectTo: 'recharges', pathMatch: 'full' },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./admin/pages/accounts-page.component').then(m => m.AccountsPageComponent)
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./admin/pages/messages-page.component').then(m => m.MessagesPageComponent)
      },
      {
        path: 'api-keys',
        loadComponent: () =>
          import('./admin/pages/api-keys-page.component').then(m => m.ApiKeysPageComponent)
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./admin/pages/alerts-page.component').then(m => m.AlertsPageComponent)
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./admin/pages/invoices-page.component').then(m => m.InvoicesPageComponent)
      },
      {
        path: 'marketing',
        loadComponent: () =>
          import('./admin/pages/marketing-page.component').then(m => m.MarketingPageComponent)
      },
      { path: 'sync', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'integration-kit', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];

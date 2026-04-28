import { Routes } from '@angular/router';
import { AboutPageComponent } from './public/about-page.component';
import { BlogPageComponent } from './public/blog-page.component';
import { BlogPostPageComponent } from './public/blog-post-page.component';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { ForgotPasswordPageComponent } from './auth/forgot-password-page.component';
import { LoginPageComponent } from './auth/login-page.component';
import { RegisterPageComponent } from './auth/register-page.component';
import { DashboardLayoutComponent } from './layouts/dashboard-layout.component';
import { HomePageComponent } from './public/home-page.component';
import { AnalyticsPageComponent } from './dashboard/pages/analytics-page.component';
import { ApiKeysPageComponent } from './dashboard/pages/api-keys-page.component';
import { DashboardOverviewPageComponent } from './dashboard/pages/dashboard-overview-page.component';
import { HistoryPageComponent } from './dashboard/pages/history-page.component';
import { PrivacyPageComponent } from './public/privacy-page.component';
import { RechargesPageComponent } from './dashboard/pages/recharges-page.component';
import { SendSmsPageComponent } from './dashboard/pages/send-sms-page.component';
import { TemplatesPageComponent } from './dashboard/pages/templates-page.component';
import { ResetPasswordPageComponent } from './auth/reset-password-page.component';
import { TermsPageComponent } from './public/terms-page.component';

export const smsClientRoutes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: 'reset-password', component: ResetPasswordPageComponent },
  { path: 'about', component: AboutPageComponent },
  { path: 'blog', component: BlogPageComponent },
  { path: 'blog/:slug', component: BlogPostPageComponent },
  { path: 'privacy', component: PrivacyPageComponent },
  { path: 'terms', component: TermsPageComponent },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [ClientAuthGuard],
    canActivateChild: [ClientAuthGuard],
    children: [
      { path: '', component: DashboardOverviewPageComponent },
      { path: 'send', component: SendSmsPageComponent },
      { path: 'history', component: HistoryPageComponent },
      { path: 'analytics', component: AnalyticsPageComponent },
      { path: 'templates', component: TemplatesPageComponent },
      { path: 'api-keys', component: ApiKeysPageComponent },
      { path: 'recharges', component: RechargesPageComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];

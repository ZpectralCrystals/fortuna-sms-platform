import { APP_INITIALIZER } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { AppComponent } from './app/app.component';
import { backofficeAdminRoutes } from './app/app.routes';
import { environment } from './environments/environment';

import { SupabaseService } from '../../shared/src/lib/services/supabase.service';

function initSupabase(supabaseService: SupabaseService) {
  return () => {
    supabaseService.configure({
      url: environment.supabaseUrl,
      anonKey: environment.supabaseAnonKey
    });
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(backofficeAdminRoutes, withComponentInputBinding()),
    {
      provide: APP_INITIALIZER,
      useFactory: initSupabase,
      deps: [SupabaseService],
      multi: true
    }
  ]
}).catch((error) => console.error(error));
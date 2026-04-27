import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sms-home-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="page">
      <section class="card">
        <h1>SMS Fortuna</h1>
        <p>Base Angular del portal cliente. Pendiente migrar contenido publico y CTAs reales.</p>
        <nav class="nav">
          <a routerLink="/login">Login</a>
          <a routerLink="/register">Registro</a>
          <a routerLink="/dashboard">Dashboard</a>
        </nav>
      </section>
    </main>
  `
})
export class HomePageComponent {}

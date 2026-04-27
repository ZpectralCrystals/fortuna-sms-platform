import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'bo-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <main class="page">
      <section class="card">
        <h1>Backoffice</h1>
        <nav class="nav" aria-label="Navegacion backoffice">
          <a routerLink="/dashboard">Dashboard</a>
          <a routerLink="/users">Usuarios</a>
          <a routerLink="/recharges">Recargas</a>
          <a routerLink="/accounts">Cuentas</a>
          <a routerLink="/messages">Mensajes</a>
          <a routerLink="/api-keys">API Keys</a>
          <a routerLink="/alerts">Alertas</a>
          <a routerLink="/invoices">Facturas</a>
          <a routerLink="/marketing">Marketing</a>
          <a routerLink="/sync">Sincronizacion</a>
          <a routerLink="/integration-kit">Kit integracion</a>
        </nav>
        <router-outlet />
      </section>
    </main>
  `
})
export class AdminLayoutComponent {}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface StepItem {
  icon: string;
  title: string;
  description: string;
  code: string;
}

interface BenefitItem {
  icon: string;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
}

interface PlanItem {
  name: string;
  price: string;
  priceUnit?: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  externalUrl?: string;
}

@Component({
  selector: 'sms-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="landing">
      <section class="hero">
        <div class="hero__shade"></div>
        <div class="pattern"></div>

        <nav class="topbar" aria-label="Navegacion principal">
          <a class="brand" routerLink="/">
            <span class="brand__mark" aria-hidden="true">SMS</span>
            <span>
              <span class="brand__name">SMS Fortuna</span>
              <span class="brand__tag">Comunicación masiva</span>
            </span>
          </a>
          <a id="comenzar-btn" class="btn btn--light btn--small" routerLink="/register">Comenzar</a>
        </nav>

        <div class="hero__content">
          <div class="hero__copy">
            <p class="eyebrow">Solución empresarial de mensajería</p>
            <h1>Envía SMS masivos desde tu aplicación o nuestra plataforma web</h1>
            <p class="hero__lead">
              Integra mediante API en tu aplicación o usa nuestra plataforma web directamente. No necesitas desarrollo técnico,
              envía SMS desde nuestro panel de control con alcance garantizado a tus clientes.
            </p>

            <div class="hero__modes" aria-label="Modalidades de uso">
              <article class="glass-card">
                <span class="icon" aria-hidden="true">API</span>
                <h3>Integración API</h3>
                <p>Para desarrolladores: integra SMS en tu aplicación o sistema</p>
              </article>
              <article class="glass-card">
                <span class="icon" aria-hidden="true">WEB</span>
                <h3>Plataforma Web</h3>
                <p>Sin código: envía SMS directamente desde nuestro panel</p>
              </article>
            </div>

            <div class="actions">
              <a class="btn btn--light" routerLink="/register">Prueba gratis <span aria-hidden="true">→</span></a>
              <a class="btn btn--outline" routerLink="/dashboard/api-keys">Ver documentación</a>
            </div>

            <div class="stats" aria-label="Metricas principales">
              <div>
                <strong>99.9%</strong>
                <span>Entrega garantizada</span>
              </div>
              <div>
                <strong>&lt;5s</strong>
                <span>Tiempo de envío</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Soporte técnico</span>
              </div>
            </div>
          </div>

          <div class="hero__preview" aria-hidden="true">
            <div class="code-window code-window--float">
              <div class="dots"><span></span><span></span><span></span></div>
              <pre>{{ heroCode }}</pre>
              <p class="muted-line">→ Enviando SMS...</p>
              <p class="success-line">✓ Mensaje entregado exitosamente</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section section--muted" id="features">
        <div class="container">
          <header class="section__header">
            <h2>Todo lo que necesitas para comunicarte</h2>
            <p>
              Nuestra plataforma de SMS corporativo ofrece las herramientas más avanzadas para que conectes con tus clientes
              de manera efectiva
            </p>
          </header>

          <div class="feature-grid">
            <article class="feature-card" *ngFor="let feature of features">
              <span class="feature-card__icon" aria-hidden="true">{{ feature.icon }}</span>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section" id="como-funciona">
        <div class="container">
          <header class="section__header">
            <h2>¿Cómo funciona?</h2>
            <p>Integración simple y rápida en 3 pasos. De la configuración al primer mensaje en minutos.</p>
          </header>

          <div class="steps">
            <article class="step" *ngFor="let step of steps; let index = index" [class.step--reverse]="index % 2 === 1">
              <div class="step__copy">
                <div class="step__meta">
                  <span class="step__number">{{ index + 1 }}</span>
                  <span class="step__icon" aria-hidden="true">{{ step.icon }}</span>
                </div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </div>

              <div class="code-window">
                <div class="dots"><span></span><span></span><span></span></div>
                <pre>{{ step.code }}</pre>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="section section--bluewash" id="beneficios">
        <div class="container">
          <header class="section__header">
            <h2>Beneficios para tu negocio</h2>
            <p>Descubre por qué más empresas confían en SMS Fortuna para sus comunicaciones críticas</p>
          </header>

          <div class="benefit-grid">
            <article class="benefit-card" *ngFor="let benefit of benefits">
              <div class="benefit-card__top">
                <span class="benefit-card__icon" aria-hidden="true">{{ benefit.icon }}</span>
                <span class="benefit-card__stat">
                  <strong>{{ benefit.stat }}</strong>
                  <small>{{ benefit.statLabel }}</small>
                </span>
              </div>
              <h3>{{ benefit.title }}</h3>
              <p>{{ benefit.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section" id="politicas">
        <div class="container">
          <header class="section__header">
            <span class="section__icon" aria-hidden="true">✓</span>
            <h2>Compromiso con las Buenas Prácticas</h2>
            <p>
              Nuestra plataforma cumple con las normas de protección al consumidor y promueve comunicaciones respetuosas
            </p>
          </header>

          <div class="policy-grid">
            <article class="policy-card policy-card--good">
              <div class="policy-card__icon" aria-hidden="true">✓</div>
              <div>
                <h3>Mensajería Responsable</h3>
                <ul>
                  <li>Cumplimiento de normas de protección al consumidor</li>
                  <li>Uso de lenguaje cordial y respetuoso en todos los mensajes</li>
                  <li>Comunicación profesional en campañas de marketing y cobranza</li>
                  <li>Respeto a los derechos de los consumidores</li>
                </ul>
              </div>
            </article>

            <article class="policy-card policy-card--bad">
              <div class="policy-card__icon" aria-hidden="true">!</div>
              <div>
                <h3>Políticas de Uso</h3>
                <p class="policy-card__label">Prohibiciones estrictas:</p>
                <ul>
                  <li>Lenguaje irrespetuoso, ofensivo o amenazante</li>
                  <li>Mensajes que incumplan las normas de protección al consumidor</li>
                  <li>Contenido fraudulento o engañoso</li>
                </ul>
                <p class="policy-card__warning">
                  El incumplimiento de estas políticas resultará en la desactivación inmediata de su cuenta
                </p>
              </div>
            </article>
          </div>

          <aside class="quality-note">
            <h3>Nuestro Compromiso con la Calidad</h3>
            <p>
              Monitoreamos activamente el contenido de los mensajes para garantizar el cumplimiento de las normas de protección
              al consumidor. Promovemos una comunicación empresarial ética, cordial y profesional que beneficie tanto a las
              empresas como a los consumidores.
            </p>
          </aside>
        </div>
      </section>

      <section class="section" id="precios">
        <div class="container">
          <header class="section__header">
            <h2>Precios simples y transparentes</h2>
            <p>Comienza gratis y escala según tus necesidades. Solo pagas por lo que usas.</p>
          </header>

          <div class="pricing-grid">
            <article class="plan-card" *ngFor="let plan of plans" [class.plan-card--popular]="plan.popular">
              <div class="popular-badge" *ngIf="plan.popular">Más popular</div>
              <div class="plan-card__header">
                <h3>{{ plan.name }}</h3>
                <p>{{ plan.description }}</p>
              </div>

              <div class="plan-card__price">
                <span *ngIf="plan.price !== 'Personalizado'">S/ </span>{{ plan.price }}
                <small *ngIf="plan.priceUnit">{{ plan.priceUnit }}</small>
              </div>

              <ul class="plan-card__features">
                <li *ngFor="let item of plan.features">{{ item }}</li>
              </ul>

              <a
                *ngIf="plan.externalUrl; else registerPlan"
                class="btn"
                [class.btn--light]="plan.popular"
                [class.btn--primary]="!plan.popular"
                [href]="plan.externalUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ plan.cta }}
              </a>
              <ng-template #registerPlan>
                <a class="btn" [class.btn--light]="plan.popular" [class.btn--primary]="!plan.popular" routerLink="/register">
                  {{ plan.cta }}
                </a>
              </ng-template>
            </article>
          </div>

          <div class="sales-note">
            <p>¿Necesitas un plan personalizado o tienes dudas sobre precios?</p>
            <a
              href="https://wa.me/51982165728?text=Hola%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20los%20servicios%20de%20Fortuna%20SMS.%20Me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20planes%20y%20precios."
              target="_blank"
              rel="noopener noreferrer"
            >
              Habla con nuestro equipo de ventas
            </a>
          </div>
        </div>
      </section>

      <section class="cta">
        <div class="pattern"></div>
        <div class="container cta__inner">
          <p class="eyebrow">Comienza hoy mismo</p>
          <h2>¿Listo para transformar tu comunicación?</h2>
          <p>
            Únete a cientos de empresas que ya confían en nuestra plataforma para enviar millones de SMS cada mes.
            Integración en minutos, resultados inmediatos.
          </p>

          <div class="actions actions--center">
            <a class="btn btn--light" routerLink="/register">Comenzar gratis <span aria-hidden="true">→</span></a>
            <a class="btn btn--outline" routerLink="/login">Iniciar sesión</a>
          </div>

          <div class="cta__stats">
            <div><strong>10 SMS</strong><span>Gratis al registrarte</span></div>
            <div><strong>5 min</strong><span>Tiempo de integración</span></div>
            <div><strong>Sin tarjeta</strong><span>Para comenzar gratis</span></div>
          </div>
        </div>
      </section>

      <footer class="footer">
        <div class="container">
          <div class="footer__grid">
            <section>
              <a class="brand brand--footer" routerLink="/">
                <span class="brand__mark" aria-hidden="true">SMS</span>
                <span>
                  <span class="brand__name">SMS Fortuna</span>
                  <span class="brand__tag">Comunicación masiva</span>
                </span>
              </a>
              <p>La solución más confiable para enviar SMS desde tu aplicación o plataforma web. El mejor precio del Perú.</p>
              <div class="socials" aria-label="Redes sociales">
                <a href="#" aria-label="Twitter">X</a>
                <a href="#" aria-label="GitHub">GH</a>
                <a href="#" aria-label="LinkedIn">in</a>
              </div>
            </section>

            <section>
              <h3>Producto</h3>
              <ul>
                <li><a href="#precios">Precios</a></li>
                <li><a routerLink="/dashboard/api-keys">Documentación API</a></li>
                <li><a href="#features">Integraciones</a></li>
              </ul>
            </section>

            <section>
              <h3>Empresa</h3>
              <ul>
                <!-- TODO: activar /about y /blog cuando existan rutas publicas en Angular. -->
                <li><span class="footer__plain">Sobre nosotros</span></li>
                <li><span class="footer__plain">Blog</span></li>
                <li><a routerLink="/privacy">Privacidad</a></li>
                <li><a routerLink="/terms">Términos de servicio</a></li>
              </ul>
            </section>

            <section>
              <h3>Contacto</h3>
              <ul class="contact-list">
                <li><span aria-hidden="true">✉</span><a href="mailto:admin@fortuna.com.pe">admin&#64;fortuna.com.pe</a></li>
                <li>
                  <span aria-hidden="true">☎</span>
                  <a
                    href="https://wa.me/51982165728?text=Hola%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20Fortuna%20SMS."
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    +51 982 165 728
                  </a>
                </li>
                <li><span aria-hidden="true">⌖</span><span>Lima, Perú</span></li>
              </ul>
            </section>
          </div>

          <div class="footer__bottom">
            <p>© {{ currentYear }} SMS Fortuna. Todos los derechos reservados. Fortuna Fintech SAC.</p>
            <nav aria-label="Legal">
              <a routerLink="/privacy">Política de privacidad</a>
              <a routerLink="/terms">Términos de uso</a>
              <a routerLink="/privacy">Cookies</a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      background: #ffffff;
      color: #111827;
    }

    * {
      box-sizing: border-box;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .landing {
      min-height: 100vh;
      background: #ffffff;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }

    .container,
    .topbar,
    .hero__content {
      width: min(100% - 32px, 1180px);
      margin: 0 auto;
    }

    .hero,
    .cta {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 48%, #0891b2 100%);
      color: #ffffff;
    }

    .hero__shade {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.05);
    }

    .pattern {
      position: absolute;
      inset: 0;
      opacity: 0.3;
      background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.28) 1px, transparent 0);
      background-size: 28px 28px;
    }

    .topbar {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 24px 0;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .brand__mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border: 2px solid currentColor;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0;
    }

    .brand__name,
    .brand__tag {
      display: block;
    }

    .brand__name {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      line-height: 1.1;
    }

    .brand__tag {
      color: #dbeafe;
      font-size: 12px;
    }

    .hero__content {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(340px, 0.85fr);
      gap: 48px;
      align-items: center;
      padding: 80px 0 128px;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.18);
      color: #ffffff;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 700;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    .hero h1 {
      max-width: 760px;
      margin-top: 24px;
      font-size: clamp(44px, 6vw, 64px);
      line-height: 1.05;
      font-weight: 850;
    }

    .hero__lead {
      max-width: 720px;
      margin-top: 24px;
      color: #dbeafe;
      font-size: 20px;
    }

    .hero__modes {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-top: 32px;
    }

    .glass-card {
      min-height: 170px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      padding: 20px;
      backdrop-filter: blur(12px);
    }

    .glass-card .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 46px;
      height: 32px;
      margin-bottom: 14px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.16);
      font-size: 12px;
      font-weight: 800;
    }

    .glass-card h3 {
      margin-bottom: 8px;
      font-size: 18px;
    }

    .glass-card p {
      color: #dbeafe;
      font-size: 14px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 32px;
    }

    .actions--center {
      justify-content: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 52px;
      border-radius: 8px;
      border: 2px solid transparent;
      padding: 14px 26px;
      font-weight: 800;
      transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
      cursor: pointer;
    }

    .btn:hover {
      transform: translateY(-1px);
    }

    .btn--small {
      min-height: 42px;
      padding: 10px 24px;
    }

    .btn--light {
      background: #ffffff;
      color: #2563eb;
      box-shadow: 0 16px 34px rgba(15, 23, 42, 0.16);
    }

    .btn--light:hover {
      background: #eff6ff;
      box-shadow: 0 20px 42px rgba(15, 23, 42, 0.2);
    }

    .btn--outline {
      border-color: #ffffff;
      color: #ffffff;
      background: transparent;
    }

    .btn--outline:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .btn--primary {
      background: #2563eb;
      color: #ffffff;
    }

    .btn--primary:hover {
      background: #1d4ed8;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 28px;
      margin-top: 48px;
    }

    .stats strong,
    .cta__stats strong {
      display: block;
      color: #ffffff;
      font-size: 30px;
      line-height: 1.1;
    }

    .stats span,
    .cta__stats span {
      display: block;
      margin-top: 6px;
      color: #dbeafe;
      font-size: 14px;
    }

    .hero__preview {
      display: block;
    }

    .code-window {
      overflow: hidden;
      border-radius: 12px;
      background: #111827;
      padding: 24px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
    }

    .code-window--float {
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(17, 24, 39, 0.96);
      outline: 24px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(14px);
    }

    .dots {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .dots span {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      background: #ef4444;
    }

    .dots span:nth-child(2) {
      background: #eab308;
    }

    .dots span:nth-child(3) {
      background: #22c55e;
    }

    pre {
      margin: 0;
      overflow-x: auto;
      color: #4ade80;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 14px;
      line-height: 1.7;
      white-space: pre;
    }

    .muted-line,
    .success-line {
      margin-top: 12px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 14px;
    }

    .muted-line {
      color: #9ca3af;
    }

    .success-line {
      color: #4ade80;
    }

    .section {
      padding: 80px 0;
      background: #ffffff;
    }

    .section--muted {
      background: #f9fafb;
    }

    .section--bluewash {
      background: linear-gradient(135deg, #f9fafb 0%, #eff6ff 100%);
    }

    .section__header {
      max-width: 820px;
      margin: 0 auto 64px;
      text-align: center;
    }

    .section__header h2,
    .cta h2 {
      font-size: clamp(36px, 5vw, 52px);
      line-height: 1.12;
      font-weight: 850;
      color: #111827;
    }

    .section__header p {
      margin-top: 16px;
      color: #4b5563;
      font-size: 20px;
    }

    .section__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 54px;
      margin-bottom: 16px;
      border-radius: 999px;
      background: #dbeafe;
      color: #2563eb;
      font-size: 28px;
      font-weight: 900;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 28px;
    }

    .feature-card,
    .benefit-card,
    .plan-card {
      border: 1px solid #f3f4f6;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      transition: transform 180ms ease, box-shadow 180ms ease;
    }

    .feature-card {
      border-radius: 12px;
      padding: 30px;
    }

    .feature-card:hover,
    .benefit-card:hover,
    .plan-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 24px 44px rgba(15, 23, 42, 0.12);
    }

    .feature-card__icon,
    .step__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 10px;
      background: #dbeafe;
      color: #2563eb;
      font-size: 12px;
      font-weight: 900;
    }

    .feature-card h3,
    .benefit-card h3 {
      margin-top: 22px;
      color: #111827;
      font-size: 20px;
      line-height: 1.25;
    }

    .feature-card p,
    .benefit-card p {
      margin-top: 12px;
      color: #4b5563;
    }

    .steps {
      display: grid;
      gap: 64px;
    }

    .step {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 48px;
      align-items: center;
    }

    .step--reverse .step__copy {
      order: 2;
    }

    .step--reverse .code-window {
      order: 1;
    }

    .step__meta {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .step__number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 999px;
      background: #2563eb;
      color: #ffffff;
      font-size: 20px;
      font-weight: 850;
    }

    .step h3 {
      color: #111827;
      font-size: 32px;
      line-height: 1.15;
    }

    .step p {
      margin-top: 16px;
      color: #4b5563;
      font-size: 18px;
    }

    .benefit-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 28px;
    }

    .benefit-card {
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
    }

    .benefit-card__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }

    .benefit-card__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: linear-gradient(135deg, #3b82f6, #06b6d4);
      color: #ffffff;
      font-size: 20px;
      font-weight: 900;
    }

    .benefit-card__stat {
      text-align: right;
    }

    .benefit-card__stat strong {
      display: block;
      color: #2563eb;
      font-size: 26px;
      line-height: 1.1;
    }

    .benefit-card__stat small {
      color: #6b7280;
      font-size: 12px;
      font-weight: 700;
    }

    .policy-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 32px;
      max-width: 980px;
      margin: 0 auto;
    }

    .policy-card {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      border-radius: 12px;
      border: 2px solid;
      padding: 30px;
    }

    .policy-card--good {
      border-color: #bbf7d0;
      background: #f0fdf4;
    }

    .policy-card--bad {
      border-color: #fecaca;
      background: #fef2f2;
    }

    .policy-card__icon {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      color: #ffffff;
      background: #16a34a;
      font-weight: 900;
    }

    .policy-card--bad .policy-card__icon {
      background: #dc2626;
    }

    .policy-card h3 {
      margin-bottom: 12px;
      color: #111827;
      font-size: 20px;
    }

    .policy-card ul {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
      color: #374151;
    }

    .policy-card li {
      position: relative;
      padding-left: 22px;
    }

    .policy-card li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #16a34a;
      font-weight: 900;
    }

    .policy-card--bad li::before {
      content: "×";
      color: #dc2626;
    }

    .policy-card__label {
      margin-bottom: 12px;
      color: #991b1b;
      font-weight: 800;
    }

    .policy-card__warning {
      margin-top: 18px;
      border-radius: 8px;
      background: #fee2e2;
      padding: 12px;
      color: #7f1d1d;
      font-size: 14px;
      font-weight: 800;
    }

    .quality-note {
      max-width: 860px;
      margin: 48px auto 0;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      background: #eff6ff;
      padding: 30px;
      text-align: center;
    }

    .quality-note h3 {
      margin-bottom: 12px;
      font-size: 18px;
    }

    .quality-note p {
      color: #374151;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 30px;
      max-width: 1120px;
      margin: 0 auto;
      align-items: stretch;
    }

    .plan-card {
      position: relative;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      background: #f9fafb;
      padding: 32px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    }

    .plan-card--popular {
      color: #ffffff;
      background: linear-gradient(135deg, #2563eb, #0891b2);
      transform: scale(1.04);
      box-shadow: 0 24px 58px rgba(37, 99, 235, 0.28);
    }

    .plan-card--popular:hover {
      transform: translateY(-4px) scale(1.04);
    }

    .popular-badge {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 999px;
      background: linear-gradient(90deg, #facc15, #f97316);
      color: #ffffff;
      padding: 9px 20px;
      white-space: nowrap;
      font-size: 14px;
      font-weight: 900;
      box-shadow: 0 10px 22px rgba(249, 115, 22, 0.28);
    }

    .plan-card__header h3 {
      font-size: 24px;
    }

    .plan-card__header p {
      margin-top: 8px;
      color: #4b5563;
      font-size: 14px;
    }

    .plan-card--popular .plan-card__header p {
      color: #dbeafe;
    }

    .plan-card__price {
      margin-top: 28px;
      font-size: 48px;
      line-height: 1;
      font-weight: 850;
    }

    .plan-card__price small {
      margin-left: 8px;
      color: #4b5563;
      font-size: 16px;
      font-weight: 500;
    }

    .plan-card--popular .plan-card__price small {
      color: #dbeafe;
    }

    .plan-card__features {
      display: grid;
      gap: 14px;
      margin: 30px 0;
      padding: 0;
      list-style: none;
    }

    .plan-card__features li {
      position: relative;
      padding-left: 28px;
      color: #374151;
      font-size: 14px;
    }

    .plan-card__features li::before {
      content: "✓";
      position: absolute;
      left: 0;
      top: 0;
      color: #2563eb;
      font-weight: 900;
    }

    .plan-card--popular .plan-card__features li {
      color: #eff6ff;
    }

    .plan-card--popular .plan-card__features li::before {
      color: #bfdbfe;
    }

    .plan-card .btn {
      width: 100%;
      margin-top: auto;
    }

    .sales-note {
      margin-top: 64px;
      text-align: center;
    }

    .sales-note p {
      margin-bottom: 16px;
      color: #4b5563;
      font-size: 18px;
    }

    .sales-note a {
      color: #2563eb;
      font-size: 18px;
      font-weight: 800;
      text-decoration: underline;
    }

    .cta {
      padding: 80px 0;
      text-align: center;
    }

    .cta__inner {
      position: relative;
      z-index: 1;
      max-width: 960px;
    }

    .cta .eyebrow {
      margin: 0 auto 28px;
    }

    .cta h2 {
      color: #ffffff;
    }

    .cta p {
      max-width: 760px;
      margin: 24px auto 0;
      color: #dbeafe;
      font-size: 20px;
    }

    .cta__stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 28px;
      max-width: 760px;
      margin: 48px auto 0;
    }

    .footer {
      background: #111827;
      color: #d1d5db;
      padding: 48px 0 32px;
    }

    .footer__grid {
      display: grid;
      grid-template-columns: 1.4fr 0.8fr 0.8fr 1fr;
      gap: 32px;
      padding-bottom: 48px;
    }

    .brand--footer {
      color: #3b82f6;
      margin-bottom: 16px;
    }

    .brand--footer .brand__name {
      color: #ffffff;
      font-size: 20px;
    }

    .brand--footer .brand__tag {
      color: #9ca3af;
    }

    .footer p {
      color: #9ca3af;
    }

    .footer h3 {
      margin-bottom: 16px;
      color: #ffffff;
      font-size: 16px;
    }

    .footer ul {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .footer a:hover {
      color: #3b82f6;
    }

    .footer__plain {
      color: #9ca3af;
    }

    .socials {
      display: flex;
      gap: 14px;
      margin-top: 18px;
    }

    .socials a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: #1f2937;
      color: #d1d5db;
      font-size: 12px;
      font-weight: 900;
    }

    .contact-list li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 0;
    }

    .contact-list span[aria-hidden="true"] {
      color: #3b82f6;
      font-weight: 900;
    }

    .footer__bottom {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      border-top: 1px solid #1f2937;
      padding-top: 30px;
      font-size: 14px;
    }

    .footer__bottom nav {
      display: flex;
      flex-wrap: wrap;
      gap: 22px;
    }

    @media (max-width: 1050px) {
      .hero__content,
      .step {
        grid-template-columns: 1fr;
      }

      .hero__preview {
        display: none;
      }

      .feature-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .benefit-grid,
      .pricing-grid {
        grid-template-columns: 1fr;
      }

      .plan-card--popular,
      .plan-card--popular:hover {
        transform: none;
      }

      .footer__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .step--reverse .step__copy,
      .step--reverse .code-window {
        order: initial;
      }
    }

    @media (max-width: 720px) {
      .container,
      .topbar,
      .hero__content {
        width: min(100% - 24px, 1180px);
      }

      .topbar {
        align-items: flex-start;
      }

      .brand__name {
        font-size: 20px;
      }

      .hero__content {
        padding: 56px 0 80px;
      }

      .hero h1 {
        font-size: 40px;
      }

      .hero__lead,
      .section__header p,
      .cta p {
        font-size: 18px;
      }

      .hero__modes,
      .stats,
      .feature-grid,
      .policy-grid,
      .cta__stats,
      .footer__grid {
        grid-template-columns: 1fr;
      }

      .actions,
      .actions--center {
        flex-direction: column;
        align-items: stretch;
      }

      .section,
      .cta {
        padding: 64px 0;
      }

      .section__header {
        margin-bottom: 42px;
      }

      .section__header h2,
      .cta h2 {
        font-size: 34px;
      }

      .policy-card {
        padding: 24px;
      }

      .footer__bottom {
        flex-direction: column;
      }
    }
  `]
})
export class HomePageComponent {
  readonly currentYear = new Date().getFullYear();

  readonly heroCode = `{
  "to": "+51999999999",
  "message": "Tu código es: 1234",
  "from": "MiApp"
}`;

  readonly features: FeatureItem[] = [
    {
      icon: 'FAST',
      title: 'Envío instantáneo',
      description: 'Mensajes entregados en menos de 5 segundos. Velocidad garantizada para comunicaciones urgentes y notificaciones en tiempo real.'
    },
    {
      icon: 'API',
      title: 'Integración API simple',
      description: 'Documentación clara y endpoints REST fáciles de usar. Integra SMS en tu aplicación en minutos con nuestros SDKs.'
    },
    {
      icon: 'MKT',
      title: 'Campañas de Marketing',
      description: 'Crea y gestiona campañas masivas de marketing desde nuestra plataforma. Llega a miles de clientes con mensajes personalizados.'
    },
    {
      icon: 'S/',
      title: 'Cobranza Masiva',
      description: 'Automatiza tus recordatorios de pago y gestión de cobranza. Envía notificaciones masivas de manera eficiente y organizada.'
    },
    {
      icon: 'SEC',
      title: 'Seguridad empresarial',
      description: 'Encriptación de extremo a extremo y cumplimiento normativo. Tus datos y los de tus clientes siempre protegidos.'
    },
    {
      icon: 'DATA',
      title: 'Panel de análisis',
      description: 'Métricas detalladas de entregas, aperturas y conversiones. Toma decisiones basadas en datos reales.'
    },
    {
      icon: 'PE',
      title: 'Cobertura nacional',
      description: 'Compatible con todos los operadores del Perú. Alcanza a tus clientes sin importar su proveedor de telefonía.'
    },
    {
      icon: '24H',
      title: 'Programación flexible',
      description: 'Envía mensajes inmediatos o programa campañas futuras. Control total sobre tus comunicaciones.'
    }
  ];

  readonly steps: StepItem[] = [
    {
      icon: 'CLI',
      title: 'Integra la API',
      description: 'Obtén tu API Key y comienza a integrar nuestro servicio en tu aplicación con solo unas líneas de código. Documentación completa disponible.',
      code: `curl -X POST https://api.smscorp.pe/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+51999999999",
    "message": "Hola desde mi app",
    "from": "MiEmpresa"
  }'`
    },
    {
      icon: 'SEND',
      title: 'Envía mensajes',
      description: 'Utiliza nuestros endpoints para enviar SMS individuales o masivos. Soporta personalización, programación y envíos en lote.',
      code: `{
  "status": "queued",
  "messageId": "msg_abc123",
  "credits_used": 1,
  "timestamp": "2024-01-15T10:30:00Z"
}`
    },
    {
      icon: 'OK',
      title: 'Monitorea resultados',
      description: 'Recibe confirmaciones en tiempo real y accede a reportes detallados. Webhooks disponibles para notificaciones automáticas.',
      code: `{
  "status": "delivered",
  "messageId": "msg_abc123",
  "delivered_at": "2024-01-15T10:30:03Z",
  "operator": "Movistar"
}`
    }
  ];

  readonly benefits: BenefitItem[] = [
    {
      icon: '98%',
      title: 'Aumenta conversiones',
      description: 'Los SMS tienen una tasa de apertura del 98%, mucho mayor que el email. Alcanza a tus clientes donde realmente prestan atención.',
      stat: '98%',
      statLabel: 'Tasa de apertura'
    },
    {
      icon: '3x',
      title: 'Fideliza clientes',
      description: 'Mantén informados a tus clientes con notificaciones de pedidos, recordatorios y promociones personalizadas.',
      stat: '3x',
      statLabel: 'Más engagement'
    },
    {
      icon: 'SMS',
      title: 'Alertas críticas',
      description: 'Ideal para verificaciones de identidad, códigos OTP, alertas de seguridad y notificaciones urgentes.',
      stat: '<5s',
      statLabel: 'Entrega promedio'
    },
    {
      icon: '2FA',
      title: 'Autenticación segura',
      description: 'Implementa autenticación de dos factores (2FA) y verificación de usuarios de forma confiable.',
      stat: '100%',
      statLabel: 'Seguro'
    },
    {
      icon: 'S/',
      title: 'Mejor precio del Perú',
      description: 'Sin costos ocultos, sin mínimos mensuales. El precio más competitivo del mercado. Solo pagas por los SMS que envías.',
      stat: 'S/ 0.08',
      statLabel: 'Por SMS'
    },
    {
      icon: '24/7',
      title: 'Soporte dedicado',
      description: 'Equipo técnico disponible 24/7 para resolver tus dudas y ayudarte en la integración.',
      stat: '24/7',
      statLabel: 'Siempre disponible'
    }
  ];

  readonly plans: PlanItem[] = [
    {
      name: 'Starter',
      price: '0',
      description: 'Perfecto para probar el servicio',
      features: [
        '10 SMS gratis al registrarte',
        'Acceso completo a la API',
        'Documentación técnica',
        'Panel de control',
        'Soporte por email',
        'Sin tarjeta de crédito'
      ],
      cta: 'Comenzar gratis',
      popular: false
    },
    {
      name: 'Business',
      price: '0.08',
      priceUnit: 'por SMS',
      description: 'El mejor precio del Perú',
      features: [
        'S/ 0.08 por SMS enviado',
        'El precio más competitivo del mercado',
        'Sin mínimos mensuales',
        'API ilimitada',
        'Webhooks en tiempo real',
        'Envíos masivos',
        'Soporte prioritario 24/7',
        'Reportes avanzados'
      ],
      cta: 'Empezar ahora',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Personalizado',
      description: 'Soluciones a medida para grandes volúmenes',
      features: [
        'Precios corporativos especiales',
        'Dedicación exclusiva',
        'SLA garantizado 99.9%',
        'Infraestructura dedicada',
        'Consultor asignado',
        'Integraciones personalizadas',
        'Facturación flexible',
        'Capacitación del equipo'
      ],
      cta: 'Contactar ventas',
      popular: false,
      externalUrl: 'https://wa.me/51982165728?text=Hola%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20el%20plan%20Enterprise%20de%20Fortuna%20SMS.%20Me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20soluciones%20personalizadas.'
    }
  ];
}

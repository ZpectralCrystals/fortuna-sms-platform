import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sms-about-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="about-page">
      <header class="topbar">
        <div class="wide-container">
          <a class="back-link" routerLink="/">
            <span class="arrow" aria-hidden="true">←</span>
            Volver al inicio
          </a>
        </div>
      </header>

      <section class="hero">
  <div class="wide-container hero__content">
    <div class="hero__copy">
      <h1>Sobre Nosotros</h1>
      <p>Innovación peruana al servicio de tu comunicación empresarial</p>
    </div>
  </div>
</section>

      <section class="content-container">
        <article class="intro-card">
          <div class="prose">
            <p class="lead">
              Somos una <strong>marca peruana</strong> de Fortuna Fintech SAC, comprometida con brindar
              soluciones tecnológicas de vanguardia para la comunicación empresarial en el Perú y la región.
            </p>

            <p>
              Nuestra plataforma está orientada a facilitar la gestión de comunicaciones masivas mediante
              mensajería SMS, poniendo a disposición de empresas, emprendedores y desarrolladores una
              <strong> API robusta y una plataforma web intuitiva</strong> que transforman la manera
              en que las organizaciones se conectan con sus clientes.
            </p>
          </div>
        </article>

        <section class="section-block">
          <h2>Nuestros Servicios</h2>

          <div class="services-grid">
            <article class="service-card">
              <div class="service-icon service-icon--green">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3>Validación de Usuarios</h3>
              <p>
                Verificación segura mediante códigos SMS para autenticación de dos factores,
                recuperación de contraseñas y confirmación de identidad.
              </p>
            </article>

            <article class="service-card">
              <div class="service-icon service-icon--purple">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m3 17 6-6 4 4 8-8"></path>
                  <path d="M14 7h7v7"></path>
                </svg>
              </div>
              <h3>Campañas de Marketing</h3>
              <p>
                Envío masivo de mensajes promocionales, ofertas especiales y notificaciones
                de valor para mantener a tus clientes informados y aumentar tus ventas.
              </p>
            </article>

            <article class="service-card">
              <div class="service-icon service-icon--orange">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3>Cobranza Masiva</h3>
              <p>
                Recordatorios automáticos de pagos, estados de cuenta y gestión eficiente
                de cobranzas con tasas de respuesta superiores.
              </p>
            </article>
          </div>
        </section>

        <section class="price-band">
          <div class="price-band__inner">
            <div class="price-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="2" x2="12" y2="22"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div>
              <h2>El Mejor Precio del Perú</h2>
              <p class="price-lead">
                Nos enorgullece ofrecer las <strong>tarifas más competitivas del mercado peruano</strong>,
                sin comprometer la calidad ni la confiabilidad de nuestro servicio.
              </p>
              <p>
                Creemos que la tecnología de comunicación empresarial debe ser accesible para todos,
                desde startups hasta grandes corporaciones.
              </p>
            </div>
          </div>
        </section>

        <section class="tech-card">
          <h2>Tecnología y Facilidad de Uso</h2>

          <div class="tech-grid">
            <article>
              <div class="tech-heading">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m13 2-10 14h9l-1 6 10-14h-9l1-6z"></path>
                </svg>
                <h3>API Potente</h3>
              </div>
              <p>
                Nuestra API REST permite integrar el envío de SMS directamente en tus aplicaciones,
                sistemas y plataformas con solo unas líneas de código. Documentación completa,
                ejemplos prácticos y soporte técnico para desarrolladores.
              </p>
            </article>

            <article>
              <div class="tech-heading">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
                </svg>
                <h3>Plataforma Web</h3>
              </div>
              <p>
                Para quienes prefieren una interfaz visual, nuestra plataforma web ofrece
                todas las herramientas necesarias para gestionar campañas, ver estadísticas
                en tiempo real y administrar contactos de forma sencilla e intuitiva.
              </p>
            </article>
          </div>
        </section>

        <figure class="image-card">
          <img
            src="https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200"
            alt="Tecnología y Desarrollo de APIs"
          />
          <figcaption>
            <p>Integraciones simples y poderosas para tu negocio</p>
            <span>Conecta tu sistema con nuestra API en minutos</span>
          </figcaption>
        </figure>

        <section class="commitment-card">
          <h2>Nuestro Compromiso</h2>

          <div class="commitment-copy">
            <p>
              En <strong>Fortuna Fintech SAC</strong>, trabajamos día a día para ser el aliado tecnológico
              que las empresas peruanas necesitan para crecer y comunicarse eficientemente con sus clientes.
            </p>

            <p>
              Nuestra misión es democratizar el acceso a soluciones de mensajería empresarial,
              ofreciendo calidad internacional con precios justos y soporte local en español.
            </p>

            <p class="tagline">Innovación peruana, alcance global</p>
          </div>
        </section>

        <section class="final-cta">
          <a routerLink="/register">Comienza Ahora Gratis</a>
          <p>Sin contratos. Sin costos ocultos. Paga solo por lo que usas.</p>
        </section>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      background: #ffffff;
      color: #111827;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .about-page {
      min-height: 100vh;
      background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
    }

    .wide-container,
    .content-container {
      width: min(100% - 32px, 1180px);
      margin: 0 auto;
    }

    .content-container {
      width: min(100% - 32px, 896px);
      padding: 64px 0;
    }

    .topbar {
      background: #ffffff;
      box-shadow: 0 1px 8px rgba(15, 23, 42, 0.08);
    }

    .topbar .wide-container {
      padding: 16px 0;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #4b5563;
      font-weight: 600;
      transition: color 180ms ease;
    }

    .back-link:hover {
      color: #2563eb;
    }

    .arrow {
      font-size: 20px;
      line-height: 1;
    }

   .hero {
  position: relative;
  height: 384px;
  overflow: hidden;
  background:
    linear-gradient(
      90deg,
      rgba(30, 58, 138, 0.78),
      rgba(30, 58, 138, 0.58)
    ),
    url('/assets/fortuna-background.jpg') center / cover no-repeat;
}

    .hero__content {
      position: relative;
      z-index: 1;
      height: 100%;
      display: flex;
      align-items: center;
    }

    .hero__copy {
      color: #ffffff;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    h1 {
      margin-bottom: 16px;
      font-size: 48px;
      line-height: 1.08;
      font-weight: 800;
    }

    .hero__copy p {
      max-width: 672px;
      color: #dbeafe;
      font-size: 20px;
      line-height: 1.6;
    }

    .intro-card,
    .service-card,
    .tech-card {
      background: #ffffff;
    }

    .intro-card {
      margin-bottom: 48px;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
    }

    .prose {
      display: grid;
      gap: 16px;
      color: #374151;
    }

    .prose p {
      line-height: 1.75;
    }

    .prose .lead {
      font-size: 20px;
    }

    .section-block {
      margin-bottom: 48px;
    }

    .section-block > h2 {
      margin-bottom: 32px;
      color: #111827;
      font-size: 30px;
      line-height: 1.2;
      font-weight: 800;
      text-align: center;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
    }

    .service-card {
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
      transition: box-shadow 180ms ease;
    }

    .service-card:hover {
      box-shadow: 0 18px 34px rgba(15, 23, 42, 0.16);
    }

    .service-icon {
      display: flex;
      width: 48px;
      height: 48px;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      border-radius: 999px;
    }

    .service-icon svg,
    .tech-heading svg,
    .price-icon svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .service-icon--green {
      background: #dcfce7;
      color: #16a34a;
    }

    .service-icon--purple {
      background: #f3e8ff;
      color: #9333ea;
    }

    .service-icon--orange {
      background: #ffedd5;
      color: #ea580c;
    }

    .service-card h3 {
      margin-bottom: 12px;
      color: #111827;
      font-size: 20px;
      line-height: 1.25;
      font-weight: 700;
    }

    .service-card p {
      color: #4b5563;
      line-height: 1.6;
    }

    .price-band {
      margin-bottom: 48px;
      border-radius: 16px;
      background: linear-gradient(90deg, #2563eb, #1d4ed8);
      padding: 32px;
      color: #ffffff;
      box-shadow: 0 20px 44px rgba(37, 99, 235, 0.26);
    }

    .price-band__inner {
      display: flex;
      align-items: flex-start;
      gap: 24px;
    }

    .price-icon {
      flex: 0 0 auto;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.2);
      padding: 12px;
    }

    .price-icon svg {
      width: 32px;
      height: 32px;
      color: #ffffff;
    }

    .price-band h2 {
      margin-bottom: 16px;
      font-size: 30px;
      line-height: 1.2;
      font-weight: 800;
    }

    .price-band p {
      color: #dbeafe;
      line-height: 1.65;
    }

    .price-band .price-lead {
      margin-bottom: 16px;
      color: #eff6ff;
      font-size: 20px;
    }

    .tech-card {
      margin-bottom: 48px;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
    }

    .tech-card > h2 {
      margin-bottom: 24px;
      color: #111827;
      font-size: 30px;
      line-height: 1.2;
      font-weight: 800;
    }

    .tech-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 32px;
    }

    .tech-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .tech-heading svg {
      flex: 0 0 auto;
      color: #2563eb;
    }

    .tech-heading h3 {
      color: #111827;
      font-size: 20px;
      line-height: 1.25;
      font-weight: 700;
    }

    .tech-card p {
      color: #374151;
      line-height: 1.7;
    }

    .image-card {
      overflow: hidden;
      margin: 0 0 48px;
      border-radius: 16px;
      box-shadow: 0 24px 56px rgba(15, 23, 42, 0.24);
    }

    .image-card img {
      display: block;
      width: 100%;
      height: 384px;
      object-fit: cover;
    }

    .image-card figcaption {
      background: linear-gradient(90deg, #1f2937, #111827);
      padding: 24px;
      text-align: center;
    }

    .image-card figcaption p {
      color: #ffffff;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.4;
    }

    .image-card figcaption span {
      display: block;
      margin-top: 8px;
      color: #d1d5db;
    }

    .commitment-card {
      border: 2px solid #e5e7eb;
      border-radius: 16px;
      background: #f9fafb;
      padding: 32px;
    }

    .commitment-card h2 {
      margin-bottom: 24px;
      color: #111827;
      font-size: 30px;
      line-height: 1.2;
      font-weight: 800;
      text-align: center;
    }

    .commitment-copy {
      display: grid;
      max-width: 768px;
      margin: 0 auto;
      gap: 16px;
      color: #374151;
      text-align: center;
    }

    .commitment-copy p {
      font-size: 18px;
      line-height: 1.75;
    }

    .commitment-copy .tagline {
      margin-top: 8px;
      color: #2563eb;
      font-size: 20px;
      font-weight: 700;
    }

    .final-cta {
      margin-top: 48px;
      text-align: center;
    }

    .final-cta a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: #2563eb;
      color: #ffffff;
      padding: 16px 32px;
      font-size: 18px;
      font-weight: 700;
      box-shadow: 0 16px 32px rgba(37, 99, 235, 0.24);
      transition: background 180ms ease, box-shadow 180ms ease;
    }

    .final-cta a:hover {
      background: #1d4ed8;
      box-shadow: 0 18px 40px rgba(37, 99, 235, 0.3);
    }

    .final-cta p {
      margin-top: 16px;
      color: #4b5563;
    }

    @media (max-width: 800px) {
      .services-grid,
      .tech-grid {
        grid-template-columns: 1fr;
      }

      .price-band__inner {
        flex-direction: column;
      }
    }

    @media (max-width: 640px) {
      .wide-container,
      .content-container {
        width: min(100% - 24px, 1180px);
      }

      .hero {
        height: 340px;
      }

      h1 {
        font-size: 40px;
      }

      .intro-card,
      .price-band,
      .tech-card,
      .commitment-card {
        padding: 24px;
      }

      .image-card img {
        height: 300px;
      }
    }
  `]
})
export class AboutPageComponent { }

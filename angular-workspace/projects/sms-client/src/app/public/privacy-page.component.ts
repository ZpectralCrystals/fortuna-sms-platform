import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sms-privacy-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="legal-page">
      <header class="topbar">
        <div class="shell shell--wide">
          <a class="back-link" routerLink="/">
            <span aria-hidden="true">←</span>
            Volver al inicio
          </a>
        </div>
      </header>

      <section class="hero">
        <div class="shell">
          <div class="hero__title">
            <span class="hero__icon" aria-hidden="true">✓</span>
            <h1>Política de Privacidad y Tratamiento de Datos Personales</h1>
          </div>
          <p>Última actualización: Febrero 2026</p>
        </div>
      </section>

      <section class="shell content-wrap">
        <article class="legal-card">
          <section class="legal-section">
            <p>
              Esta Política de Privacidad describe los lineamientos mediante los cuales <strong>FORTUNA FINTECH S.A.C.</strong>,
              identificada con RUC 20605652183 (en adelante, "FORTUNA"), recopila, almacena, conserva, procesa,
              analiza, comparte y elimina información personal proporcionada por las personas naturales que utilizan
              la plataforma <strong>SMS Fortuna</strong>, conforme a lo previsto en la <strong>Ley N.º 29733 – Ley de
              Protección de Datos Personales</strong>, su Reglamento aprobado por Decreto Supremo N.º 003-2013-JUS
              y las normas complementarias vigentes en el Perú.
            </p>
            <p>
              Esta Política constituye un acuerdo independiente, vinculante y complementario a los Términos y Condiciones
              de Uso. La aceptación de la presente política es requisito indispensable para la creación, uso, permanencia
              y continuidad de la relación digital entre EL USUARIO y FORTUNA.
            </p>
          </section>

          <section class="legal-section">
            <h2><span aria-hidden="true">👁</span> Finalidad del Tratamiento de la Información</h2>
            <p>La información personal recopilada será utilizada para los siguientes propósitos:</p>
            <ul>
              <li>Autenticar la identidad de EL USUARIO y gestionar su cuenta</li>
              <li>Establecer perfiles de uso y preferencias de servicio</li>
              <li>Validar operaciones y efectuar evaluaciones de seguridad</li>
              <li>Habilitar funcionalidades digitales y ejecutar análisis predictivos</li>
              <li>Permitir el envío de mensajes SMS y gestionar campañas</li>
              <li>Administrar los servicios ofrecidos dentro de la plataforma</li>
              <li>Prevenir operaciones fraudulentas y mantener la integridad del sistema</li>
              <li>Cumplir obligaciones regulatorias y legales vigentes</li>
              <li>Desarrollar mejoras tecnológicas destinadas a optimizar la experiencia de uso</li>
            </ul>
            <p>
              FORTUNA declara que no solicitará más datos de los estrictamente necesarios para cumplir las finalidades
              operativas, analíticas y regulatorias que justifican la existencia de la relación contractual con EL USUARIO.
            </p>
          </section>

          <section class="legal-section">
            <h2><span aria-hidden="true">▣</span> Información que Recopilamos</h2>
            <p><strong>Datos de identificación:</strong> nombre completo, documento de identidad, correo electrónico y número de teléfono.</p>
            <p><strong>Datos de cuenta:</strong> credenciales de acceso, configuraciones de usuario y preferencias de servicio.</p>
            <p><strong>Datos de uso:</strong> registros de mensajes enviados, destinatarios, horarios, estadísticas de entrega y análisis de campañas.</p>
            <p><strong>Información técnica:</strong> dirección IP, tipo de navegador, sistema operativo, datos de acceso a la API y registros de actividad.</p>
            <p><strong>Datos de transacciones:</strong> información de pagos, recargas, consumo de créditos y facturación.</p>
          </section>

          <section class="legal-section">
            <h2><span aria-hidden="true">⏱</span> Almacenamiento, Conservación y Período de Guarda</h2>
            <p>
              EL USUARIO otorga consentimiento expreso para que sus datos sean almacenados en servidores o
              infraestructuras tecnológicas que FORTUNA determine convenientes, sean de carácter local o internacional,
              propios o administrados por terceros especialistas en servicios digitales.
            </p>
            <aside class="notice notice--warning">
              <p>
                <strong>Período de Conservación:</strong> Los datos personales recopilados serán conservados por un
                período de <strong>diez (10) años</strong> contados desde la culminación de las obligaciones
                contractuales, finalización del servicio, cancelación de la cuenta o extinción de la relación jurídica.
              </p>
            </aside>
            <p>
              Este plazo obedece a criterios regulatorios, auditorías internas, exigencias probatorias y obligaciones
              vinculadas a prevención de riesgos, solvencia económica y mecanismos de trazabilidad corporativa.
            </p>
          </section>

          <section class="legal-section">
            <h2><span aria-hidden="true">⇄</span> Compartición, Transferencia y Acceso a Información Personal</h2>
            <p>
              EL USUARIO autoriza expresamente a FORTUNA para compartir, transferir o permitir el acceso a su información
              personal con:
            </p>
            <ul>
              <li>Proveedores tecnológicos que presten servicios de infraestructura y hosting</li>
              <li>Operadores de telecomunicaciones para el envío de mensajes SMS</li>
              <li>Empresas vinculadas o aliados estratégicos que presten servicios operativos</li>
              <li>Proveedores de servicios de procesamiento de pagos y facturación</li>
              <li>Entidades de validación de identidad y scoring</li>
              <li>Servicios de almacenamiento de datos y análisis financiero</li>
            </ul>
            <p>
              Estas transferencias no vulneran la confidencialidad de los datos, pues se ejecutan bajo cláusulas
              contractuales que garantizan su protección, integridad y uso limitado exclusivamente a las finalidades
              antes descritas. <strong>FORTUNA no comercializa datos personales</strong> y no autoriza su uso para
              fines distintos a los consentidos.
            </p>
          </section>

          <section class="legal-section">
            <h2><span aria-hidden="true">🔒</span> Seguridad Informática y Medidas de Protección</h2>
            <p>FORTUNA emplea medidas técnicas y organizativas destinadas a mitigar riesgos informáticos, entre ellas:</p>
            <ul>
              <li>Encriptación de datos en tránsito y en reposo</li>
              <li>Anonimización de información sensible cuando corresponda</li>
              <li>Monitoreo permanente de sistemas y detección de amenazas</li>
              <li>Algoritmos de autenticación robustos y autenticación multifactor</li>
              <li>Protocolos de seguridad industrial y mejores prácticas internacionales</li>
              <li>Copias de seguridad regulares y planes de recuperación ante desastres</li>
              <li>Auditorías de seguridad periódicas y evaluación de vulnerabilidades</li>
            </ul>
            <aside class="notice notice--info">
              <p>
                <strong>Importante:</strong> Debido a la naturaleza digital de las comunicaciones globales, EL USUARIO
                reconoce que ningún sistema es absolutamente infalible y acepta que FORTUNA no asumirá responsabilidad
                por daños derivados de ataques externos, accesos no autorizados o vulneraciones que escapen a su
                diligencia razonable.
              </p>
            </aside>
          </section>

          <section class="legal-section">
            <h2><span aria-hidden="true">✓</span> Consentimiento Informado y Derechos del Usuario</h2>
            <p>
              De acuerdo con la Ley N.º 29733 y su Reglamento, EL USUARIO tiene derecho a ejercer los siguientes derechos:
            </p>
            <div class="rights-grid">
              <div>
                <h3>Derecho de Acceso</h3>
                <p>Obtener información sobre sus datos personales que están siendo tratados.</p>
              </div>
              <div>
                <h3>Derecho de Rectificación</h3>
                <p>Actualizar o corregir datos inexactos, incompletos o desactualizados.</p>
              </div>
              <div>
                <h3>Derecho de Cancelación</h3>
                <p>Solicitar la supresión de sus datos personales cuando corresponda.</p>
              </div>
              <div>
                <h3>Derecho de Oposición</h3>
                <p>Oponerse al tratamiento de sus datos para fines específicos.</p>
              </div>
              <div>
                <h3>Derecho de Revocatoria</h3>
                <p>Retirar el consentimiento otorgado previamente.</p>
              </div>
              <div>
                <h3>Derecho de Portabilidad</h3>
                <p>Obtener una copia de sus datos en formato estructurado.</p>
              </div>
            </div>
            <p>
              Toda solicitud deberá presentarse mediante los canales de contacto señalados en esta política.
              FORTUNA contará con los plazos legales establecidos por la Autoridad Nacional de Protección de Datos
              Personales para su atención.
            </p>
          </section>

          <section class="legal-section">
            <h2><span aria-hidden="true">▤</span> Cookies y Tecnologías Similares</h2>
            <p>
              Utilizamos cookies y tecnologías similares para mejorar la experiencia del usuario, analizar el uso
              del servicio, mantener sesiones activas y personalizar contenido. EL USUARIO puede configurar su
              navegador para gestionar o rechazar cookies, aunque esto puede afectar algunas funcionalidades de
              la plataforma.
            </p>
          </section>

          <section class="legal-section">
            <h2><span aria-hidden="true">!</span> Modificaciones a esta Política</h2>
            <p>
              La presente Política podrá ser modificada cuando resulten necesarias adecuaciones tecnológicas,
              regulatorias u operativas. La actualización será puesta a disposición de EL USUARIO en la plataforma
              o en medios digitales equivalentes. El uso continuado del servicio después de las modificaciones
              constituirá manifestación inequívoca de aceptación de los nuevos términos.
            </p>
          </section>

          <section class="legal-section">
            <h2>Disposición Final</h2>
            <aside class="notice notice--danger">
              <p>
                Al aceptar esta Política, EL USUARIO reconoce que la provisión de datos personales constituye un
                requisito esencial para la existencia misma del servicio, y que la negativa a proporcionarlos o su
                posterior retiro impedirá el uso de la plataforma, la ejecución de servicios de mensajería SMS y el
                mantenimiento de obligaciones contractuales.
              </p>
            </aside>
          </section>

          <section class="legal-section">
            <h2>Contacto y Consultas</h2>
            <p>
              Si tiene preguntas sobre esta política de privacidad, el tratamiento de sus datos personales o desea
              ejercer sus derechos, puede contactarnos a través de los siguientes canales:
            </p>
            <div class="contact-box">
              <p><strong>Razón Social:</strong> Fortuna Fintech S.A.C.</p>
              <p><strong>RUC:</strong> 20605652183</p>
              <p><strong>Email:</strong> <a href="mailto:admin@fortuna.com.pe">admin&#64;fortuna.com.pe</a></p>
              <p><strong>Teléfono:</strong> <a href="tel:015101609">01 5101609</a></p>
              <p><strong>Dirección:</strong> Pasaje Martín Olaya 129, Oficina 1905, Miraflores, Lima, Perú</p>
            </div>
          </section>

          <aside class="notice notice--info notice--final">
            <p>
              FORTUNA FINTECH S.A.C. está comprometida con la protección de su privacidad y el cumplimiento estricto
              de la Ley N.º 29733 - Ley de Protección de Datos Personales y todas las normas complementarias vigentes
              en la República del Perú.
            </p>
          </aside>
        </article>

        <div class="cta-row">
          <a class="primary-cta" routerLink="/register">Crear Cuenta Gratuita</a>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      background: #f9fafb;
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

    .legal-page {
      min-height: 100vh;
      background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
    }

    .shell {
      width: min(100% - 32px, 896px);
      margin: 0 auto;
    }

    .shell--wide {
      width: min(100% - 32px, 1180px);
    }

    .topbar {
      background: #ffffff;
      box-shadow: 0 1px 8px rgba(15, 23, 42, 0.08);
    }

    .topbar .shell {
      padding: 16px 0;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #4b5563;
      font-weight: 700;
      transition: color 180ms ease;
    }

    .back-link:hover {
      color: #2563eb;
    }

    .hero {
      background: linear-gradient(90deg, #2563eb, #1d4ed8);
      color: #ffffff;
      padding: 64px 0;
    }

    .hero__title {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .hero__icon {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border: 2px solid rgba(255, 255, 255, 0.88);
      border-radius: 12px;
      font-size: 30px;
      font-weight: 900;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    h1 {
      font-size: clamp(32px, 5vw, 42px);
      line-height: 1.12;
      font-weight: 850;
    }

    .hero p {
      margin-top: 16px;
      color: #dbeafe;
      font-size: 20px;
    }

    .content-wrap {
      padding: 48px 0;
    }

    .legal-card {
      display: grid;
      gap: 32px;
      border-radius: 20px;
      background: #ffffff;
      padding: 32px;
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12);
    }

    .legal-section {
      display: grid;
      gap: 14px;
      border-top: 1px solid #e5e7eb;
      padding-top: 24px;
    }

    .legal-section:first-child {
      border-top: 0;
      padding-top: 0;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #111827;
      font-size: 26px;
      line-height: 1.2;
      font-weight: 850;
    }

    h2 span {
      color: #2563eb;
      font-size: 24px;
    }

    h3 {
      margin-bottom: 6px;
      color: #111827;
      font-size: 16px;
      font-weight: 800;
    }

    p,
    li {
      color: #374151;
      line-height: 1.7;
    }

    ul {
      display: grid;
      gap: 8px;
      margin: 0 0 0 20px;
      padding: 0;
      color: #374151;
    }

    .notice {
      border-left: 4px solid;
      padding: 16px;
    }

    .notice--warning {
      border-color: #f59e0b;
      background: #fffbeb;
    }

    .notice--info {
      border-color: #2563eb;
      background: #eff6ff;
    }

    .notice--danger {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .notice--final {
      padding: 24px;
      font-weight: 800;
    }

    .rights-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .rights-grid div,
    .contact-box {
      border-radius: 10px;
      background: #f9fafb;
      padding: 16px;
    }

    .rights-grid p {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.55;
    }

    .contact-box {
      display: grid;
      gap: 10px;
      padding: 24px;
    }

    .contact-box a {
      color: #2563eb;
      font-weight: 700;
    }

    .contact-box a:hover {
      text-decoration: underline;
    }

    .cta-row {
      margin-top: 32px;
      text-align: center;
    }

    .primary-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 50px;
      border-radius: 12px;
      background: #2563eb;
      color: #ffffff;
      padding: 12px 32px;
      font-size: 18px;
      font-weight: 850;
      box-shadow: 0 16px 34px rgba(37, 99, 235, 0.24);
      transition: background 180ms ease, transform 180ms ease;
    }

    .primary-cta:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    @media (max-width: 720px) {
      .shell,
      .shell--wide {
        width: min(100% - 24px, 896px);
      }

      .hero {
        padding: 48px 0;
      }

      .hero__title {
        align-items: flex-start;
      }

      .hero__icon {
        width: 44px;
        height: 44px;
        font-size: 24px;
      }

      .legal-card {
        padding: 22px;
        border-radius: 16px;
      }

      .rights-grid {
        grid-template-columns: 1fr;
      }

      h2 {
        font-size: 22px;
      }
    }
  `]
})
export class PrivacyPageComponent {}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WhatsappWidgetComponent } from './components/whatsapp-widget/whatsapp-widget.component';

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

const WHATSAPP_NUMBER = '51982165728';
const WHATSAPP_MESSAGES = {
  plan50: 'Hola, quiero información sobre el plan de S/ 50 de SMS Fortuna con 530 SMS incluidos.',
  plan100: 'Hola, quiero información sobre el plan popular de S/ 100 de SMS Fortuna con 1,060 SMS incluidos.',
  plan200: 'Hola, quiero información sobre el plan de S/ 200 de SMS Fortuna con 2,120 SMS incluidos.',
  plan500: 'Hola, quiero información sobre el plan de S/ 500 de SMS Fortuna con 5,300 SMS incluidos.',
  plan1000: 'Hola, quiero información sobre el plan de S/ 1,000 de SMS Fortuna con 10,600 SMS incluidos.',
  custom: 'Hola, quiero una consulta personalizada para contratar SMS Fortuna para mi empresa.',
  support: 'Hola, necesito soporte técnico con mi cuenta SMS Fortuna.'
} as const;

@Component({
  selector: 'sms-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, WhatsappWidgetComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  readonly currentYear = new Date().getFullYear();
  readonly whatsappMessages = WHATSAPP_MESSAGES;

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
      externalUrl: this.whatsappUrl(WHATSAPP_MESSAGES.custom)
    }
  ];

  whatsappUrl(message: string): string {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }
}

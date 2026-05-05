import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type WidgetView = 'menu' | 'plans';

interface WhatsAppPlan {
  label: string;
  sms: string;
  popular?: boolean;
  message: string;
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
  selector: 'app-whatsapp-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whatsapp-widget.component.html',
  styleUrl: './whatsapp-widget.component.scss'
})
export class WhatsappWidgetComponent {
  isOpen = false;
  view: WidgetView = 'menu';

  readonly plans: WhatsAppPlan[] = [
    { label: 'S/ 50', sms: '530 SMS incluidos', message: WHATSAPP_MESSAGES.plan50 },
    { label: 'S/ 100', sms: '1,060 SMS incluidos', popular: true, message: WHATSAPP_MESSAGES.plan100 },
    { label: 'S/ 200', sms: '2,120 SMS incluidos', message: WHATSAPP_MESSAGES.plan200 },
    { label: 'S/ 500', sms: '5,300 SMS incluidos', message: WHATSAPP_MESSAGES.plan500 },
    { label: 'S/ 1,000', sms: '10,600 SMS incluidos', message: WHATSAPP_MESSAGES.plan1000 }
  ];

  toggleWidget(): void {
    this.isOpen = !this.isOpen;

    if (!this.isOpen) {
      this.view = 'menu';
    }
  }

  closeWidget(): void {
    this.isOpen = false;
    this.view = 'menu';
  }

  showPlans(): void {
    this.view = 'plans';
  }

  showMenu(): void {
    this.view = 'menu';
  }

  openWhatsApp(message: string): void {
    window.open(this.whatsappUrl(message), '_blank', 'noopener,noreferrer');
  }

  openCustomConsultation(): void {
    this.openWhatsApp(WHATSAPP_MESSAGES.custom);
  }

  openSupport(): void {
    this.openWhatsApp(WHATSAPP_MESSAGES.support);
  }

  whatsappUrl(message: string): string {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WhatsappWidgetComponent } from './components/whatsapp-widget/whatsapp-widget.component';

const WHATSAPP_NUMBER = '51982165728';
const WHATSAPP_SUPPORT_MESSAGE = 'Hola, necesito soporte técnico con mi cuenta SMS Fortuna.';

@Component({
  selector: 'sms-about-page',
  standalone: true,
  imports: [RouterLink, WhatsappWidgetComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent {
  readonly currentYear = new Date().getFullYear();

  whatsappUrl(message: string): string {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  readonly supportWhatsAppUrl = this.whatsappUrl(WHATSAPP_SUPPORT_MESSAGE);
}

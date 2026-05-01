import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sms-about-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent {
  readonly currentYear = new Date().getFullYear();
}

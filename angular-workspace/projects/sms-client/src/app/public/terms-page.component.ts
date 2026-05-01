import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sms-terms-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms-page.component.html',
  styleUrl: './terms-page.component.scss'
})
export class TermsPageComponent {}

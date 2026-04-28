import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'sms-blog-post-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="loading-page">
      <div class="spinner" aria-label="Cargando artículo"></div>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .loading-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
    }

    .spinner {
      display: inline-block;
      width: 48px;
      height: 48px;
      border-radius: 999px;
      border: 0 solid transparent;
      border-bottom: 2px solid #2563eb;
      animation: spin 900ms linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class BlogPostPageComponent implements OnInit {
  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    void this.router.navigate(['/blog']);
  }
}

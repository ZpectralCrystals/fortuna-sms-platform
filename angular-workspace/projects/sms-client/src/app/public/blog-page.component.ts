import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image_url: string;
  published_at: string;
  reading_time: number;
  views: number;
  category: {
    name: string;
    slug: string;
  } | null;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

@Component({
  selector: 'sms-blog-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="blog-page">
      <div class="container">
        <div class="hero">
          <h1>Blog de SMS Platform</h1>
          <p>Estrategias, tutoriales y las últimas tendencias en marketing por SMS</p>
        </div>

        <div class="filters">
          <div class="search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Buscar artículos..."
              [value]="searchTerm"
              (input)="onSearch($event)"
            />
          </div>

          <div class="category-row">
            <button
              type="button"
              (click)="selectCategory('all')"
              [class.category-button--active]="selectedCategory === 'all'"
              [class.category-button--inactive]="selectedCategory !== 'all'"
              class="category-button"
            >
              Todos
            </button>

            <button
              type="button"
              *ngFor="let category of categories"
              (click)="selectCategory(category.slug)"
              [class.category-button--active]="selectedCategory === category.slug"
              [class.category-button--inactive]="selectedCategory !== category.slug"
              class="category-button"
            >
              {{ category.name }}
            </button>
          </div>
        </div>

        <div class="loading" *ngIf="loading; else loadedContent">
          <div class="spinner" aria-label="Cargando artículos"></div>
        </div>

        <ng-template #loadedContent>
          <div class="empty" *ngIf="posts.length === 0; else postsGrid">
            <p>No se encontraron artículos</p>
          </div>

          <ng-template #postsGrid>
            <div class="posts-grid">
              <a
                *ngFor="let post of posts"
                class="post-card"
                [routerLink]="['/blog', post.slug]"
              >
                <div class="post-card__media">
                  <img
                    *ngIf="post.featured_image_url; else imageFallback"
                    [src]="post.featured_image_url"
                    [alt]="post.title"
                  />
                  <ng-template #imageFallback>
                    <div class="post-card__fallback">{{ post.title.charAt(0) }}</div>
                  </ng-template>

                  <div class="post-card__category" *ngIf="post.category">
                    <span>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                      </svg>
                      {{ post.category.name }}
                    </span>
                  </div>
                </div>

                <div class="post-card__body">
                  <h2>{{ post.title }}</h2>
                  <p>{{ post.excerpt }}</p>

                  <div class="post-card__meta">
                    <div class="post-card__meta-left">
                      <span>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {{ formatDate(post.published_at) }}
                      </span>
                      <span>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {{ post.reading_time }} min
                      </span>
                    </div>
                    <span class="read-more">Leer más →</span>
                  </div>
                </div>
              </a>
            </div>
          </ng-template>
        </ng-template>
      </div>
    </main>
  `,
  styles: [`
    :host {
      display: block;
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

    .blog-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
    }

    .container {
      width: min(100% - 32px, 1180px);
      margin: 0 auto;
      padding: 64px 0;
    }

    .hero {
      margin-bottom: 64px;
      text-align: center;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    h1 {
      margin-bottom: 16px;
      color: #111827;
      font-size: 48px;
      line-height: 1.08;
      font-weight: 800;
    }

    .hero p {
      max-width: 768px;
      margin: 0 auto;
      color: #4b5563;
      font-size: 20px;
      line-height: 1.6;
    }

    .filters {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 32px;
    }

    .search-box {
      position: relative;
      flex: 1 1 auto;
    }

    .search-box svg {
      position: absolute;
      left: 12px;
      top: 50%;
      width: 20px;
      height: 20px;
      transform: translateY(-50%);
      fill: none;
      stroke: #9ca3af;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    input {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #ffffff;
      padding: 12px 16px 12px 40px;
      color: #111827;
      font: inherit;
      outline: none;
    }

    input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .category-row {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .category-button {
      border-radius: 8px;
      padding: 8px 16px;
      white-space: nowrap;
      border: 1px solid transparent;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: background 180ms ease, color 180ms ease;
    }

    .category-button--active {
      background: #2563eb;
      color: #ffffff;
    }

    .category-button--inactive {
      border-color: #d1d5db;
      background: #ffffff;
      color: #374151;
    }

    .category-button--inactive:hover {
      background: #f3f4f6;
    }

    .loading,
    .empty {
      padding: 64px 0;
      text-align: center;
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

    .empty p {
      color: #4b5563;
      font-size: 20px;
    }

    .posts-grid {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
      gap: 32px;
    }

    .post-card {
      overflow: hidden;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
      transition: transform 300ms ease, box-shadow 300ms ease;
    }

    .post-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
    }

    .post-card__media {
      position: relative;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      background: linear-gradient(135deg, #3b82f6, #9333ea);
    }

    .post-card__media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 300ms ease;
    }

    .post-card:hover .post-card__media img {
      transform: scale(1.1);
    }

    .post-card__fallback {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 40px;
      font-weight: 800;
    }

    .post-card__category {
      position: absolute;
      top: 16px;
      left: 16px;
    }

    .post-card__category span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.9);
      padding: 4px 12px;
      color: #111827;
      font-size: 14px;
      font-weight: 600;
      backdrop-filter: blur(8px);
    }

    .post-card svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .post-card__body {
      padding: 24px;
    }

    .post-card h2 {
      display: -webkit-box;
      overflow: hidden;
      margin-bottom: 12px;
      color: #111827;
      font-size: 20px;
      line-height: 1.3;
      font-weight: 800;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      transition: color 180ms ease;
    }

    .post-card:hover h2 {
      color: #2563eb;
    }

    .post-card__body > p {
      display: -webkit-box;
      overflow: hidden;
      margin-bottom: 16px;
      color: #4b5563;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .post-card__meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: #6b7280;
      font-size: 14px;
    }

    .post-card__meta-left {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
    }

    .post-card__meta-left span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .read-more {
      color: #2563eb;
      font-weight: 600;
      white-space: nowrap;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (min-width: 768px) {
      .filters {
        flex-direction: row;
      }

      .posts-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .posts-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .container {
        width: min(100% - 24px, 1180px);
        padding: 48px 0;
      }

      h1 {
        font-size: 40px;
      }
    }
  `]
})
export class BlogPageComponent {
  readonly posts: BlogPost[] = [];
  readonly categories: BlogCategory[] = [];
  selectedCategory = 'all';
  searchTerm = '';
  loading = false;

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

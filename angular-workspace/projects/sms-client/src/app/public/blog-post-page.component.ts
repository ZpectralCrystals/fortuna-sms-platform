import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'sms-blog-post-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './blog-post-page.component.html',
  styleUrl: './blog-post-page.component.scss'
})
export class BlogPostPageComponent implements OnInit {
  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    void this.router.navigate(['/blog']);
  }
}

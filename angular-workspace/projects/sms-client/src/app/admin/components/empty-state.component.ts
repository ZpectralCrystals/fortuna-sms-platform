import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type EmptyStateIcon = 'file-text' | 'none';

@Component({
  selector: 'bo-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() icon: EmptyStateIcon = 'file-text';
}

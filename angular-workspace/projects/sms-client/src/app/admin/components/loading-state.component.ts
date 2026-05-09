
import { Component, Input } from '@angular/core';

@Component({
    selector: 'bo-loading-state',
    imports: [],
    templateUrl: './loading-state.component.html',
    styleUrl: './loading-state.component.scss'
})
export class LoadingStateComponent {
  @Input() message = '';
}

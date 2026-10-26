import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-white">{{ title }}</h1>
        <p *ngIf="subtitle" class="text-sm text-brand-muted mt-0.5">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2"><ng-content select="[actions]"></ng-content></div>
    </div>
  `
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}

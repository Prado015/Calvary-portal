import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  template: `
    <div [class]="'bg-navy-card border border-brand-border rounded-brand p-5 ' + extraClass">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-white">{{ title }}</h3>
        <ng-content select="[actions]"></ng-content>
      </div>
      <ng-content></ng-content>
    </div>
  `
})
export class ChartCardComponent {
  @Input() title = '';
  @Input() extraClass = '';
}

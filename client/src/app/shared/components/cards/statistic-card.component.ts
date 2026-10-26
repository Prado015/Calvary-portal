import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-statistic-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="bg-navy-card border border-brand-border rounded-brand p-4 flex items-center gap-3">
      <div [class]="'w-11 h-11 rounded-lg flex items-center justify-center text-white ' + iconBg">
        <app-icon [name]="icon" [size]="19"></app-icon>
      </div>
      <div class="min-w-0">
        <p class="text-xs text-brand-muted truncate">{{ label }}</p>
        <p class="text-xl font-bold text-white leading-tight">{{ value }}</p>
        <p *ngIf="sublabel" class="text-[11px] text-brand-muted">{{ sublabel }}</p>
      </div>
    </div>
  `
})
export class StatisticCardComponent {
  @Input() icon = 'user';
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() sublabel = '';
  @Input() iconBg = 'bg-navy-input';
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [class]="base + ' ' + (variant === 'primary' ? primary : ghost) + ' ' + (danger ? dangerCls : '') + ' ' + extraClass"
    >
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' = 'button';
  @Input() variant: 'primary' | 'ghost' = 'primary';
  @Input() disabled = false;
  @Input() danger = false;
  @Input() extraClass = '';

  base = 'w-full flex items-center justify-center gap-2 font-semibold text-sm rounded-brand py-3.5 transition-transform active:scale-[0.98] disabled:opacity-60';
  primary = 'bg-gold-btn text-navy shadow-lg shadow-gold/20 hover:brightness-105';
  ghost = 'bg-navy-input border border-brand-border text-brand-text hover:border-gold/40';
  dangerCls = '!bg-brand-error !bg-none text-white';
}

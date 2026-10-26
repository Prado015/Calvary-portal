import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { statusLabel } from '../../../core/utils/member-status';

const STYLES: Record<string, string> = {
  present: 'bg-brand-green/15 text-brand-green',
  active: 'bg-brand-green/15 text-brand-green',
  returning: 'bg-blue-500/15 text-blue-400',
  first_time: 'bg-blue-500/15 text-blue-400',
  other_church: 'bg-blue-500/15 text-blue-400',
  bible_study: 'bg-purple-500/15 text-purple-300',
  late: 'bg-gold/15 text-gold-light',
  needs_followup: 'bg-gold/15 text-gold-light',
  sunday_goer: 'bg-yellow-400/15 text-yellow-300',
  absent: 'bg-brand-error/15 text-brand-error',
  inactive: 'bg-brand-error/15 text-brand-error',
  excused: 'bg-brand-muted/20 text-brand-muted'
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span [class]="'inline-block px-2.5 py-1 rounded text-[11px] font-medium ' + cls">{{ text }}</span>`
})
export class StatusBadgeComponent {
  @Input() status = '';
  @Input() label = '';

  get text(): string { return this.label || statusLabel(this.status); }

  get cls(): string {
    const key = String(this.status || '').toLowerCase().replace(/\s+/g, '_');
    return STYLES[key] || 'bg-brand-muted/20 text-brand-muted';
  }
}
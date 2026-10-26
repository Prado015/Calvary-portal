import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Usage: <app-input label="Email" [(value)]="form.email" />
@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-[18px]">
      <label *ngIf="label" class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">
        {{ label }}
      </label>
      <input
        [type]="type"
        [placeholder]="placeholder"
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [required]="required"
        class="w-full bg-navy-input border border-brand-border rounded-brand text-brand-text text-sm py-3 px-4 outline-none focus:border-gold/50 transition-colors"
      />
      <p *ngIf="error" class="text-brand-error text-xs mt-1.5">{{ error }}</p>
    </div>
  `
})
export class InputComponent {
  @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() error = '';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
}

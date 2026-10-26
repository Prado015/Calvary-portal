import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../ui/button.component';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div *ngIf="open" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm">
        <h3 class="text-white font-bold mb-2">{{ title }}</h3>
        <p class="text-sm text-brand-muted mb-6">{{ message }}</p>
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="cancelled.emit()">Cancel</app-button>
          <app-button [danger]="danger" (click)="confirmed.emit()">{{ confirmLabel }}</app-button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmationModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() danger = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}

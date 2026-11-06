import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FollowupService, FollowUpLog } from '../../../core/services/followup.service';
import { ButtonComponent } from '../ui/button.component';

const METHODS = [
  { value: 'call', label: 'Phone call' }, { value: 'sms', label: 'Text message' }, { value: 'chat', label: 'Messenger / chat' },
  { value: 'visit', label: 'Home visit' }, { value: 'email', label: 'Email' }, { value: 'other', label: 'Other' }
];

// Record that someone reached out to a member, and see who has contacted them before.
@Component({
  selector: 'app-log-contact-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, DatePipe],
  template: `
    <div *ngIf="open && member" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 class="text-white font-bold mb-1">Log a follow-up</h3>
        <p class="text-sm text-brand-muted mb-4">{{ member.firstName }} {{ member.lastName }}</p>

        <select [(ngModel)]="method" name="method" class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text">
          <option *ngFor="let m of methods" [value]="m.value">{{ m.label }}</option>
        </select>
        <textarea [(ngModel)]="note" name="note" rows="3" maxlength="500" placeholder="What happened? (e.g. reached her mom, will come this Sunday)"
                  class="w-full bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text resize-none mb-3"></textarea>

        <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
        <div class="flex gap-3 mb-5">
          <app-button variant="ghost" (click)="closed.emit()">Close</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</app-button>
        </div>

        <div *ngIf="logs.length">
          <p class="text-[11px] uppercase tracking-wide text-gold-light font-semibold mb-2">Earlier follow-ups</p>
          <ul class="space-y-2">
            <li *ngFor="let l of logs" class="bg-navy-input rounded-lg px-3 py-2 text-sm">
              <div class="flex justify-between gap-2 text-xs text-brand-muted">
                <span>{{ label(l.method) }}<span *ngIf="l.by"> · {{ l.by.firstName }}</span></span>
                <span>{{ l.createdAt | date: 'MMM d, h:mm a' }}</span>
              </div>
              <p *ngIf="l.note" class="text-brand-text mt-1 break-words">{{ l.note }}</p>
            </li>
          </ul>
        </div>
      </form>
    </div>
  `
})
export class LogContactModalComponent implements OnChanges {
  private api = inject(FollowupService);

  @Input() open = false;
  @Input() member: { _id: string; firstName: string; lastName: string } | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  methods = METHODS;
  method = 'call';
  note = '';
  logs: FollowUpLog[] = [];
  saving = false;
  error = '';

  ngOnChanges(c: SimpleChanges): void {
    if (!c['open'] || !this.open || !this.member) return;
    this.method = 'call'; this.note = ''; this.error = ''; this.logs = [];
    this.api.logs(this.member._id).subscribe({ next: (l) => (this.logs = l), error: () => {} });
  }

  label(v: string): string { return METHODS.find((m) => m.value === v)?.label || v; }

  save(): void {
    if (!this.member || this.saving) return;
    this.saving = true; this.error = '';
    this.api.addLog(this.member._id, { method: this.method, note: this.note }).subscribe({
      next: () => { this.saving = false; this.saved.emit(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not save'; }
    });
  }
}

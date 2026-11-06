import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotifyService, NotifyProviders, SendResponse } from '../../../core/services/notify.service';
import { ButtonComponent } from '../ui/button.component';

export interface Recipient { _id: string; firstName: string; lastName: string; contact?: string; email?: string; }

const TEMPLATES = [
  { key: 'miss', label: 'We miss you', kind: 'followup', subject: 'We miss you at Calvary Tabernacle',
    text: 'Hi {firstName}, this is Calvary Tabernacle. We missed you at church and are praying for you. Is there anything we can pray about or help with? God bless you!' },
  { key: 'remind', label: 'Service reminder', kind: 'reminder', subject: 'Service reminder',
    text: 'Hi {firstName}, a friendly reminder that we gather for worship this Sunday. We would love to see you there! - Calvary Tabernacle' },
  { key: 'custom', label: 'Write my own', kind: 'broadcast', subject: 'A message from Calvary Tabernacle', text: '' }
];

// Phones: 09XXXXXXXXX, +639XXXXXXXXX, 9XXXXXXXXX
const validPhone = (s?: string) => /^(63|0)?9\d{9}$/.test(String(s || '').replace(/[^\d]/g, ''));
const validEmail = (s?: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

// Send a text or email to one or many members. {firstName} / {name} are filled in per person.
@Component({
  selector: 'app-message-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div *ngIf="open" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <!-- Result -->
        <ng-container *ngIf="result">
          <h3 class="text-white font-bold mb-1">Message sent</h3>
          <p class="text-sm text-brand-muted mb-4">
            <span class="text-brand-green font-semibold">{{ result.counts.sent }} sent</span>
            <span *ngIf="result.counts.skipped"> · {{ result.counts.skipped }} skipped</span>
            <span *ngIf="result.counts.failed" class="text-brand-error"> · {{ result.counts.failed }} failed</span>
          </p>
          <ul *ngIf="problems.length" class="mb-4 space-y-1.5 text-sm max-h-48 overflow-y-auto">
            <li *ngFor="let p of problems" class="flex justify-between gap-3 bg-navy-input rounded-lg px-3 py-2">
              <span class="text-brand-text truncate">{{ p.name }}</span>
              <span class="text-xs text-brand-muted text-right">{{ p.error }}</span>
            </li>
          </ul>
          <app-button (click)="finish()">Done</app-button>
        </ng-container>

        <!-- Compose -->
        <form *ngIf="!result" (ngSubmit)="send()">
          <h3 class="text-white font-bold mb-1">Send a message</h3>
          <p class="text-sm text-brand-muted mb-4">
            To <span class="text-white font-medium">{{ members.length === 1 ? members[0].firstName + ' ' + members[0].lastName : members.length + ' people' }}</span>
          </p>

          <div class="grid grid-cols-2 gap-2 mb-4">
            <button type="button" (click)="channel = 'sms'" [disabled]="providers && !providers.sms"
                    class="h-11 rounded-brand border text-sm font-medium transition-colors disabled:opacity-40"
                    [ngClass]="channel === 'sms' ? 'bg-gold/15 border-gold/60 text-gold-light' : 'bg-navy-input border-brand-border text-brand-muted'">Text message</button>
            <button type="button" (click)="channel = 'email'" [disabled]="providers && !providers.email"
                    class="h-11 rounded-brand border text-sm font-medium transition-colors disabled:opacity-40"
                    [ngClass]="channel === 'email' ? 'bg-gold/15 border-gold/60 text-gold-light' : 'bg-navy-input border-brand-border text-brand-muted'">Email</button>
          </div>

          <p *ngIf="providers && !providers[channel]" class="text-sm text-gold-light bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 mb-4">
            {{ channel === 'sms' ? 'Text messaging' : 'Email' }} isn't set up on the server yet. Ask your system administrator to add the
            {{ channel === 'sms' ? 'SEMAPHORE_API_KEY' : 'SMTP settings' }}.
          </p>

          <select [(ngModel)]="templateKey" (ngModelChange)="applyTemplate()" name="tpl"
                  class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text">
            <option *ngFor="let t of templates" [value]="t.key">{{ t.label }}</option>
          </select>

          <input *ngIf="channel === 'email'" [(ngModel)]="subject" name="subject" placeholder="Subject"
                 class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text" />

          <textarea [(ngModel)]="message" name="message" rows="5" placeholder="Type your message…"
                    class="w-full bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text resize-none"></textarea>
          <div class="flex justify-between text-xs text-brand-muted mt-1 mb-3">
            <span>Use {{ '{' }}firstName{{ '}' }} to add each person's name</span>
            <span [class.text-brand-error]="tooLong">{{ message.length }}<ng-container *ngIf="channel === 'sms'"> / {{ maxSms }} · {{ segments }} SMS</ng-container></span>
          </div>

          <div *ngIf="preview" class="mb-3 rounded-lg bg-navy-input border border-brand-border px-3 py-2 text-sm text-brand-muted">
            <p class="text-[10px] uppercase tracking-wide mb-1">Preview for {{ members[0].firstName }}</p>
            <p class="text-brand-text whitespace-pre-wrap break-words">{{ preview }}</p>
          </div>

          <p class="text-xs mb-4" [ngClass]="reachable === members.length ? 'text-brand-muted' : 'text-gold-light'">
            {{ reachable }} of {{ members.length }} {{ reachable === 1 ? 'has' : 'have' }} a {{ channel === 'sms' ? 'mobile number' : 'email address' }}<span *ngIf="reachable < members.length"> — the rest will be skipped</span>.
          </p>

          <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
          <div class="flex gap-3">
            <app-button variant="ghost" (click)="closed.emit()">Cancel</app-button>
            <app-button type="submit" [disabled]="sending || !canSend">{{ sending ? 'Sending…' : 'Send' }}</app-button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class MessageModalComponent implements OnChanges {
  private api = inject(NotifyService);

  @Input() open = false;
  @Input() members: Recipient[] = [];
  @Input() kind: 'followup' | 'broadcast' | 'reminder' = 'followup';
  @Output() closed = new EventEmitter<void>();
  @Output() sent = new EventEmitter<void>();

  templates = TEMPLATES;
  maxSms = 459;
  providers: NotifyProviders | null = null;
  channel: 'sms' | 'email' = 'sms';
  templateKey = 'miss';
  subject = '';
  message = '';
  sending = false;
  error = '';
  result: SendResponse | null = null;
  problems: { name: string; error: string }[] = [];

  ngOnChanges(c: SimpleChanges): void {
    if (!c['open'] || !this.open) return;
    this.result = null; this.error = ''; this.sending = false; this.problems = [];
    this.templateKey = this.kind === 'reminder' ? 'remind' : this.kind === 'broadcast' ? 'custom' : 'miss';
    this.applyTemplate();
    this.api.status().subscribe({
      next: (p) => { this.providers = p; if (!p.sms && p.email) this.channel = 'email'; },
      error: () => (this.providers = null)
    });
  }

  applyTemplate(): void {
    const t = TEMPLATES.find((x) => x.key === this.templateKey)!;
    this.message = t.text;
    this.subject = t.subject;
  }

  get segments(): number { return Math.max(1, Math.ceil(this.message.length / 160)); }
  get tooLong(): boolean { return this.channel === 'sms' && this.message.length > this.maxSms; }
  get reachable(): number {
    return this.members.filter((m) => (this.channel === 'sms' ? validPhone(m.contact) : validEmail(m.email))).length;
  }
  get canSend(): boolean {
    return !!this.message.trim() && !this.tooLong && this.reachable > 0 && (!this.providers || this.providers[this.channel]);
  }
  get preview(): string {
    const m = this.members[0];
    return m && this.message.trim()
      ? this.message.replace(/\{firstName\}/g, m.firstName).replace(/\{lastName\}/g, m.lastName).replace(/\{name\}/g, `${m.firstName} ${m.lastName}`)
      : '';
  }

  send(): void {
    if (!this.canSend || this.sending) return;
    this.sending = true; this.error = '';
    const kind = TEMPLATES.find((t) => t.key === this.templateKey)?.kind === 'broadcast' ? this.kind : TEMPLATES.find((t) => t.key === this.templateKey)!.kind;
    this.api.send({ memberIds: this.members.map((m) => m._id), channel: this.channel, message: this.message, subject: this.subject, kind }).subscribe({
      next: (res) => {
        this.sending = false;
        this.result = res;
        this.problems = res.results.filter((r) => r.status !== 'sent').map((r) => ({ name: r.name, error: r.error }));
        if (res.counts.sent) this.sent.emit();
      },
      error: (e) => { this.sending = false; this.error = e.error?.message || 'Could not send the message'; }
    });
  }

  finish(): void { this.closed.emit(); }
}

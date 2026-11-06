import { Component, Injector, OnInit, effect, inject, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentStore } from '../../core/services/department-store.service';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { CellgroupService, CellgroupRecord } from '../../core/services/cellgroup.service';
import { FollowupService, FollowUpRow, FollowUpMeta } from '../../core/services/followup.service';
import { AuthService } from '../../core/services/auth.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { AvatarComponent } from '../../shared/components/common/avatar.component';
import { MessageModalComponent, Recipient } from '../../shared/components/modals/message-modal.component';
import { LogContactModalComponent } from '../../shared/components/modals/log-contact-modal.component';

const METHOD_WORDS: Record<string, string> = { call: 'called', sms: 'texted', email: 'emailed', chat: 'messaged', visit: 'visited', other: 'contacted' };

// Members who have stopped coming. Built from attendance: anyone not marked present at the last N held Sunday services,
// plus anyone flagged by hand. From here you can call, text, log a visit, or message a whole group at once.
@Component({
  selector: 'app-followup-center',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, AvatarComponent, MessageModalComponent, LogContactModalComponent],
  template: `
    <app-page-header title="Follow-up Center" subtitle="Members who have stopped coming — reach out before they drift away"></app-page-header>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <div class="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        <button *ngFor="let t of thresholds" type="button" (click)="setThreshold(t)"
                class="shrink-0 h-10 px-4 rounded-full border text-sm font-medium transition-colors"
                [ngClass]="threshold === t ? 'bg-gold/15 border-gold/60 text-gold-light' : 'bg-navy-card border-brand-border text-brand-muted'">
          Missed {{ t }}+ in a row
        </button>
      </div>
      <select *ngIf="!store" [(ngModel)]="departmentId" (ngModelChange)="onDepartmentChange()" class="h-10 bg-navy-card border border-brand-border rounded-brand text-sm px-3 text-brand-text">
        <option value="">All ministries</option>
        <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
      </select>
      <select *ngIf="cellgroups.length" [(ngModel)]="cellgroupId" (ngModelChange)="load()" class="h-10 bg-navy-card border border-brand-border rounded-brand text-sm px-3 text-brand-text">
        <option value="">All cellgroups</option>
        <option *ngFor="let c of cellgroups" [value]="c._id">{{ c.name }}</option>
      </select>
    </div>

    <p *ngIf="meta && meta.heldServices < threshold" class="mb-4 text-sm text-gold-light bg-gold/10 border border-gold/30 rounded-lg px-4 py-3">
      Not enough attendance has been recorded yet to see who stopped coming. The system needs attendance for at least {{ threshold }}
      {{ meta.serviceType || 'Sunday' }}s; so far {{ meta.heldServices }} {{ meta.heldServices === 1 ? 'has' : 'have' }} been recorded.
      Members flagged by hand still appear below.
    </p>

    <!-- Bulk bar -->
    <div *ngIf="rows.length && canManage" class="flex items-center justify-between gap-3 mb-3 flex-wrap">
      <label class="flex items-center gap-2 text-sm text-brand-muted cursor-pointer select-none">
        <input type="checkbox" [checked]="allSelected" (change)="toggleAll($any($event.target).checked)" class="accent-gold w-4 h-4" />
        Select all ({{ rows.length }})
      </label>
      <button type="button" (click)="messageSelected()" [disabled]="!selected.size"
              class="h-10 px-4 rounded-brand bg-gold-btn text-navy text-sm font-semibold disabled:opacity-40">
        Message selected{{ selected.size ? ' (' + selected.size + ')' : '' }}
      </button>
    </div>

    <div *ngIf="loading" class="text-center py-12 text-brand-muted text-sm">Loading…</div>
    <div *ngIf="!loading && error" class="text-center py-12 text-brand-error text-sm">{{ error }}</div>
    <div *ngIf="!loading && !error && !rows.length" class="text-center py-12 text-brand-muted text-sm">No one needs follow-up right now 🎉</div>

    <!-- Cards -->
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div *ngFor="let r of rows" class="bg-navy-card border rounded-brand p-4 flex flex-col gap-3"
           [ngClass]="selected.has(r.member._id) ? 'border-gold/60' : 'border-brand-border'">
        <div class="flex items-start gap-3">
          <input *ngIf="canManage" type="checkbox" [checked]="selected.has(r.member._id)" (change)="toggle(r.member._id)" class="accent-gold w-5 h-5 mt-3 shrink-0" [attr.aria-label]="'Select ' + r.member.firstName" />
          <app-avatar [name]="r.member.firstName + ' ' + r.member.lastName" [src]="r.member.photoUrl" [size]="48"></app-avatar>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-white leading-snug break-words">{{ r.member.firstName }} {{ r.member.lastName }}</p>
            <p class="text-xs text-brand-muted truncate">
              {{ r.member.cellgroup?.name || 'No cellgroup' }}<span *ngIf="r.member.cellgroup?.leaderName"> · Leader: {{ r.member.cellgroup.leaderName }}</span>
            </p>
            <p *ngIf="!store" class="text-[11px] text-brand-muted">{{ r.member.department?.name }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <span *ngIf="r.auto" class="text-[11px] font-medium px-2.5 py-1 rounded"
                [ngClass]="r.missed >= 5 ? 'bg-brand-error/15 text-brand-error' : 'bg-gold/15 text-gold-light'">Missed {{ r.missed }} in a row</span>
          <span *ngIf="r.manual" class="text-[11px] font-medium px-2.5 py-1 rounded bg-blue-500/15 text-blue-400">Flagged by hand</span>
          <span *ngIf="recentlyContacted(r)" class="text-[11px] font-medium px-2.5 py-1 rounded bg-brand-green/15 text-brand-green">Reached out</span>
        </div>

        <div class="text-xs text-brand-muted space-y-0.5">
          <p>Last seen: <span class="text-brand-text">{{ r.lastSeen ? (r.lastSeen | date: 'MMM d, y') : 'Not recorded' }}</span></p>
          <p *ngIf="r.lastContact">Last {{ verb(r.lastContactMethod) }}: <span class="text-brand-text">{{ ago(r.lastContact) }}</span></p>
          <p *ngIf="r.member.contact">{{ r.member.contact }}</p>
        </div>

        <div class="grid grid-cols-3 gap-2 mt-auto">
          <a *ngIf="r.member.contact" [href]="'tel:' + clean(r.member.contact)"
             class="h-11 rounded-brand bg-navy-input border border-brand-border text-sm font-medium text-brand-text flex items-center justify-center active:scale-[0.97] transition-transform">Call</a>
          <span *ngIf="!r.member.contact" class="h-11 rounded-brand bg-navy-input/40 border border-brand-border text-sm text-brand-muted flex items-center justify-center">No phone</span>
          <button *ngIf="canManage" type="button" (click)="messageOne(r)"
                  class="h-11 rounded-brand bg-navy-input border border-brand-border text-sm font-medium text-brand-text active:scale-[0.97] transition-transform">Message</button>
          <button *ngIf="canManage" type="button" (click)="logOne(r)"
                  class="h-11 rounded-brand bg-gold/15 border border-gold/40 text-sm font-medium text-gold-light active:scale-[0.97] transition-transform">Log</button>
        </div>
      </div>
    </div>

    <app-message-modal [open]="messageOpen" [members]="recipients" kind="followup" (closed)="messageOpen = false" (sent)="selected.clear(); load()"></app-message-modal>
    <app-log-contact-modal [open]="logOpen" [member]="logMember" (closed)="logOpen = false" (saved)="load()"></app-log-contact-modal>
  `
})
export class FollowupCenterComponent implements OnInit {
  // Inside a ministry portal the ministry is fixed; in the admin back office you pick one.
  store = inject(DepartmentStore, { optional: true });
  private injector = inject(Injector);
  private api = inject(FollowupService);
  private deptApi = inject(DepartmentService);
  private cgApi = inject(CellgroupService);
  private perms = inject(PermissionsService);
  private auth = inject(AuthService);

  thresholds = [2, 3, 4, 6];
  threshold = 3;
  departments: DepartmentRecord[] = [];
  cellgroups: CellgroupRecord[] = [];
  departmentId = '';
  cellgroupId = '';

  rows: FollowUpRow[] = [];
  meta: FollowUpMeta | null = null;
  loading = true;
  error = '';
  selected = new Set<string>();

  messageOpen = false;
  recipients: Recipient[] = [];
  logOpen = false;
  logMember: { _id: string; firstName: string; lastName: string } | null = null;

  get canManage(): boolean { return this.perms.canManage(this.auth.user()); }
  get allSelected(): boolean { return this.rows.length > 0 && this.selected.size === this.rows.length; }

  ngOnInit(): void {
    if (this.store) {
      const store = this.store;
      runInInjectionContext(this.injector, () => {
        effect(() => {
          const dept = store.department();
          if (!dept) return;
          this.departmentId = dept._id;
          this.loadCellgroups();
          this.load();
        }, { allowSignalWrites: true });
      });
    } else {
      this.deptApi.list().subscribe((d) => (this.departments = d));
      this.load();
    }
  }

  onDepartmentChange(): void { this.cellgroupId = ''; this.loadCellgroups(); this.load(); }

  private loadCellgroups(): void {
    this.cellgroups = [];
    if (this.departmentId) this.cgApi.list({ department: this.departmentId }).subscribe((l) => (this.cellgroups = l));
  }

  setThreshold(t: number): void { this.threshold = t; this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    const params: Record<string, string> = { threshold: String(this.threshold) };
    if (this.departmentId) params['department'] = this.departmentId;
    if (this.cellgroupId) params['cellgroup'] = this.cellgroupId;
    this.api.list(params).subscribe({
      next: (res) => {
        this.rows = res.data; this.meta = res.meta; this.loading = false;
        const ids = new Set(this.rows.map((r) => r.member._id));
        this.selected = new Set([...this.selected].filter((id) => ids.has(id)));
      },
      error: (e) => { this.loading = false; this.error = e.error?.message || 'Could not load the follow-up list'; }
    });
  }

  toggle(id: string): void { this.selected.has(id) ? this.selected.delete(id) : this.selected.add(id); }
  toggleAll(on: boolean): void { this.selected = on ? new Set(this.rows.map((r) => r.member._id)) : new Set(); }

  messageOne(r: FollowUpRow): void { this.recipients = [r.member]; this.messageOpen = true; }
  messageSelected(): void {
    this.recipients = this.rows.filter((r) => this.selected.has(r.member._id)).map((r) => r.member);
    if (this.recipients.length) this.messageOpen = true;
  }
  logOne(r: FollowUpRow): void { this.logMember = r.member; this.logOpen = true; }

  clean(phone: string): string { return String(phone).replace(/[^\d+]/g, ''); }
  verb(m: string | null): string { return (m && METHOD_WORDS[m]) || 'contacted'; }
  recentlyContacted(r: FollowUpRow): boolean { return !!r.lastContact && Date.now() - new Date(r.lastContact).getTime() < 7 * 86400000; }
  ago(iso: string): string {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  }
}

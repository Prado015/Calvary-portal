import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceBoardService, MemberMonth, Occurrence, SaveColumn } from '../../core/services/attendance-board.service';
import { MemberService, MemberRecord } from '../../core/services/member.service';
import { MONTH_NAMES, localIso, shiftMonth, weekdayShort } from '../../core/utils/dates';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StatisticCardComponent } from '../../shared/components/cards/statistic-card.component';
import { StatusBadgeComponent } from '../../shared/components/common/status-badge.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { ConfirmationModalComponent } from '../../shared/components/modals/confirmation-modal.component';

const COUNTED = ['present', 'late'];

// One member at a time: pick a person, see every service of the month that applies
// to their ministry, tick the ones they attended.
@Component({
  selector: 'app-individual-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, StatisticCardComponent, StatusBadgeComponent, ButtonComponent, ConfirmationModalComponent],
  template: `
    <div class="relative max-w-md mb-5">
      <div class="relative flex items-center">
        <app-icon name="search" [size]="15" extraClass="absolute left-4 text-brand-muted"></app-icon>
        <input [(ngModel)]="query" (ngModelChange)="onQuery()" placeholder="Search a member by name or ID…"
               class="w-full bg-navy-input border border-brand-border rounded-brand text-sm py-2.5 pl-11 pr-4 text-brand-text outline-none" />
      </div>
      <div *ngIf="results.length" class="absolute z-30 left-0 right-0 mt-1 bg-navy-card border border-brand-border rounded-brand overflow-hidden shadow-xl">
        <button *ngFor="let m of results" (click)="pick(m)" class="w-full text-left px-4 py-2.5 hover:bg-navy-input flex items-center justify-between text-sm">
          <span class="text-white">{{ m.firstName }} {{ m.lastName }}</span>
          <span class="text-[11px] text-brand-muted">{{ m.memberId }} · {{ m.department?.name }}</span>
        </button>
      </div>
      <p *ngIf="searched && !results.length && query.length >= 2 && !selectedId" class="text-xs text-brand-muted mt-2">No members found.</p>
    </div>

    <p *ngIf="!selectedId" class="text-brand-muted text-sm py-10 text-center border border-dashed border-brand-border rounded-brand">
      Search for a member above to see and edit their attendance.
    </p>

    <div *ngIf="loading" class="text-center py-12 text-brand-muted text-sm">Loading…</div>
    <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
    <p *ngIf="notice" class="text-brand-green text-sm mb-3">{{ notice }}</p>

    <ng-container *ngIf="!loading && data as d">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="text-white font-bold text-lg">{{ d.member.firstName }} {{ d.member.lastName }}</h3>
          <p class="text-xs text-brand-muted">{{ d.member.memberId }} · {{ d.member.department?.name }}<span *ngIf="d.member.cellgroup"> · {{ d.member.cellgroup!.name }}</span></p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="go(-1)" class="w-9 h-9 rounded-lg bg-navy-input border border-brand-border text-brand-muted hover:text-gold-light">‹</button>
          <span class="text-gold-light font-bold min-w-[140px] text-center">{{ monthName }} {{ year }}</span>
          <button (click)="go(1)" class="w-9 h-9 rounded-lg bg-navy-input border border-brand-border text-brand-muted hover:text-gold-light">›</button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <app-statistic-card icon="clipboard-check" iconBg="bg-brand-green/70" label="Attended this month" [value]="attended + ' / ' + held"></app-statistic-card>
        <app-statistic-card icon="bar-chart-3" iconBg="bg-blue-500/70" label="Attendance rate" [value]="rate + '%'"></app-statistic-card>
        <app-statistic-card icon="user-check" iconBg="bg-gold/70" label="Last attended" [value]="d.summary.lastAttended ? (d.summary.lastAttended | date:'MMM d, y') ?? '—' : 'Never'"></app-statistic-card>
        <app-statistic-card icon="users" label="Member status" [value]="statusText(d.member.status)"></app-statistic-card>
      </div>

      <div class="bg-navy-card border border-brand-border rounded-brand overflow-x-auto">
        <p *ngIf="!d.occurrences.length" class="text-brand-muted text-sm text-center py-10">No services apply to this member in {{ monthName }} {{ year }}.</p>
        <table *ngIf="d.occurrences.length" class="w-full text-sm">
          <thead>
            <tr class="bg-navy-input text-brand-muted text-xs uppercase tracking-wide text-left">
              <th class="px-4 py-3 font-medium">Date</th><th class="px-4 py-3 font-medium">Service</th>
              <th class="px-4 py-3 font-medium">Status</th><th class="px-4 py-3 font-medium text-center">Attended</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let o of d.occurrences" class="border-t border-brand-border" [class.opacity-60]="isFuture(o)">
              <td class="px-4 py-3 whitespace-nowrap">{{ wd(o.date) }}, {{ o.date | date:'MMM d' }}</td>
              <td class="px-4 py-3">{{ o.typeName }}<span *ngIf="o.department" class="text-[11px] text-brand-muted"> · {{ o.department.name }}</span></td>
              <td class="px-4 py-3">
                <app-status-badge *ngIf="isFuture(o)" status="excused" label="Upcoming"></app-status-badge>
                <app-status-badge *ngIf="!isFuture(o)" [status]="marked.has(o.key) ? 'present' : 'absent'" [label]="marked.has(o.key) ? 'Present' : 'Absent'"></app-status-badge>
              </td>
              <td class="px-4 py-3 text-center">
                <input type="checkbox" class="accent-gold w-4 h-4" [checked]="marked.has(o.key)" [disabled]="!canMark || isFuture(o)" (change)="toggle(o)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between mt-4">
        <span class="text-xs text-gold-light">{{ changes ? '● ' + changes + ' unsaved change' + (changes === 1 ? '' : 's') : '' }}</span>
        <div *ngIf="canMark" class="w-36"><app-button (click)="save()" [disabled]="!changes || saving">{{ saving ? 'Saving…' : 'Save' }}</app-button></div>
      </div>
    </ng-container>

    <app-confirmation-modal [open]="!!pendingNav" title="Discard unsaved changes?" message="You have attendance changes that are not saved yet."
      confirmLabel="Discard" [danger]="true" (confirmed)="runPending()" (cancelled)="pendingNav = null"></app-confirmation-modal>
  `
})
export class IndividualAttendanceComponent implements OnChanges {
  private api = inject(AttendanceBoardService);
  private memberApi = inject(MemberService);

  @Input() departmentId = '';
  @Input() canMark = false;

  today = localIso();
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;

  query = ''; results: MemberRecord[] = []; searched = false;
  selectedId = '';
  data: MemberMonth | null = null;
  marked = new Set<string>(); base = new Set<string>();
  loading = false; saving = false; error = ''; notice = '';
  changes = 0; attended = 0; held = 0; rate = 0;
  pendingNav: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  get monthName(): string { return MONTH_NAMES[this.month - 1]; }
  wd(d: string): string { return weekdayShort(d); }
  isFuture(o: Occurrence): boolean { return o.date > this.today; }
  statusText(s: string): string { return s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departmentId']) this.reset();
  }

  private reset(): void {
    this.selectedId = ''; this.data = null; this.query = ''; this.results = []; this.error = ''; this.notice = '';
    this.marked = new Set(); this.base = new Set(); this.recompute();
  }

  // ---- find a member
  onQuery(): void {
    clearTimeout(this.timer);
    this.selectedId = ''; this.data = null;
    const q = this.query.trim();
    if (q.length < 2) { this.results = []; this.searched = false; return; }
    this.timer = setTimeout(() => {
      const params: Record<string, string> = { search: q, limit: '8' };
      if (this.departmentId) params['department'] = this.departmentId;
      this.memberApi.list(params).subscribe({ next: (r) => { this.results = r.data; this.searched = true; }, error: () => (this.results = []) });
    }, 250);
  }
  pick(m: MemberRecord): void {
    this.selectedId = m._id; this.query = `${m.firstName} ${m.lastName}`; this.results = [];
    this.load();
  }

  // ---- load a month for the chosen member
  load(): void {
    if (!this.selectedId) return;
    this.loading = true; this.error = '';
    this.api.memberMonth(this.selectedId, this.year, this.month).subscribe({
      next: (r) => {
        this.data = r;
        this.base = new Set(Object.entries(r.marks).filter(([, s]) => COUNTED.includes(s)).map(([k]) => k));
        this.marked = new Set(this.base);
        this.recompute();
        this.loading = false;
      },
      error: (e) => { this.error = e.error?.message || 'Could not load this member.'; this.loading = false; }
    });
  }

  go(delta: number): void {
    const move = () => { const n = shiftMonth(this.year, this.month, delta); this.year = n.year; this.month = n.month; this.notice = ''; this.load(); };
    if (this.changes) this.pendingNav = move; else move();
  }
  runPending(): void { const fn = this.pendingNav; this.pendingNav = null; fn?.(); }

  toggle(o: Occurrence): void {
    if (!this.canMark || this.isFuture(o)) return;
    if (this.marked.has(o.key)) this.marked.delete(o.key); else this.marked.add(o.key);
    this.recompute();
  }

  private recompute(): void {
    const occ = this.data?.occurrences || [];
    const past = occ.filter((o) => !this.isFuture(o));
    this.held = past.length;
    this.attended = past.filter((o) => this.marked.has(o.key)).length;
    this.rate = this.held ? Math.round((this.attended / this.held) * 100) : 0;
    let c = 0;
    for (const k of this.marked) if (!this.base.has(k)) c++;
    for (const k of this.base) if (!this.marked.has(k)) c++;
    this.changes = c;
  }

  save(): void {
    if (!this.data || !this.changes) return;
    const cols: SaveColumn[] = [];
    for (const o of this.data.occurrences) {
      const on = this.marked.has(o.key), was = this.base.has(o.key);
      if (on === was) continue;
      cols.push({ typeId: o.typeId, date: o.date, serviceId: o.serviceId, marks: [{ member: this.data.member._id, status: on ? 'present' : null }] });
    }
    this.saving = true; this.error = ''; this.notice = '';
    this.api.save(cols).subscribe({
      next: (r) => { this.saving = false; this.notice = `Saved — ${r.saved} marked, ${r.cleared} cleared.`; this.load(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not save.'; }
    });
  }
}

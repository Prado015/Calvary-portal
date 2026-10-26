import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceBoardService, BoardMonth, BoardMember, Occurrence, SaveColumn } from '../../core/services/attendance-board.service';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { MONTH_NAMES, localIso, shiftMonth, dayOf, weekdayShort } from '../../core/utils/dates';
import { toCsv, downloadCsv } from '../../core/utils/csv';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ConfirmationModalComponent } from '../../shared/components/modals/confirmation-modal.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';

interface Group { typeId: string; name: string; color: string; items: Occurrence[]; }

// Header colours per service colour (full class names so Tailwind can see them).
const HEAD: Record<string, string> = {
  gold: 'bg-yellow-900/40 text-yellow-300', teal: 'bg-teal-900/40 text-teal-300', blue: 'bg-blue-900/40 text-blue-300',
  purple: 'bg-purple-900/40 text-purple-300', green: 'bg-green-900/40 text-green-300', red: 'bg-red-900/40 text-red-300'
};
const CHIP: Record<string, string> = {
  gold: 'text-yellow-300', teal: 'text-teal-300', blue: 'text-blue-300', purple: 'text-purple-300', green: 'text-green-300', red: 'text-red-300'
};
const COUNTED = ['present', 'late'];

// Monthly grid: members down the side, every service of the month across the top,
// a checkbox where they meet. Only changed cells are sent when you press Save.
@Component({
  selector: 'app-service-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ConfirmationModalComponent, ButtonComponent],
  template: `
    <div class="relative flex items-center mb-4">
      <app-icon name="search" [size]="15" extraClass="absolute left-4 text-brand-muted"></app-icon>
      <input [(ngModel)]="search" (ngModelChange)="applyFilter()" placeholder="Search member…"
             class="w-full bg-navy-input border border-brand-border rounded-brand text-sm py-2.5 pl-11 pr-4 text-brand-text outline-none" />
    </div>

    <!-- month bar -->
    <div class="flex items-center justify-between mb-4">
      <button (click)="go(-1)" class="w-9 h-9 rounded-lg bg-navy-input border border-brand-border text-brand-muted hover:text-gold-light">‹</button>
      <h3 class="text-gold-light font-bold text-lg">{{ monthName }} {{ year }}</h3>
      <button (click)="go(1)" class="w-9 h-9 rounded-lg bg-navy-input border border-brand-border text-brand-muted hover:text-gold-light">›</button>
    </div>

    <!-- toolbar -->
    <div class="flex flex-wrap gap-2 mb-3">
      <button *ngIf="canMark" (click)="markAll()" class="tb tb-green">Mark All Present</button>
      <button *ngIf="canMark" (click)="confirmClear = true" class="tb tb-red">Clear Attendance</button>
      <button *ngIf="canMark" (click)="copyPrevious()" class="tb" title="Fill empty columns from the previous week's column of the same service">Copy Previous Week</button>
      <button (click)="exportCsv()" class="tb">Export Excel (CSV)</button>
      <button *ngIf="canManage && customTypes.length" (click)="openAdd()" class="tb tb-gold">+ Add Meeting Date</button>
    </div>

    <div class="flex flex-wrap gap-x-5 gap-y-1 text-[11px] mb-3">
      <span *ngFor="let t of typeStats" [class]="chip(t.color)">{{ t.name }} avg: <b>{{ t.avg === null ? '—' : t.avg + '%' }}</b></span>
    </div>

    <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
    <p *ngIf="notice" class="text-brand-green text-sm mb-3">{{ notice }}</p>
    <p *ngIf="data?.truncated" class="text-gold-light text-xs mb-3">Showing the first 1,500 members — choose a ministry to narrow the list.</p>

    <div *ngIf="loading" class="text-center py-16 text-brand-muted text-sm">Loading…</div>

    <div *ngIf="!loading && data && !data.occurrences.length" class="text-center py-12 text-brand-muted text-sm border border-brand-border rounded-brand">
      No services to show for {{ monthName }} {{ year }}.
      <span *ngIf="canManage && customTypes.length"> Use <b>Add Meeting Date</b> to set a prayer meeting date.</span>
    </div>

    <div *ngIf="!loading && data && data.occurrences.length" class="overflow-auto max-h-[60vh] border border-brand-border rounded-brand">
      <table class="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            <th rowspan="2" class="sticky top-0 left-0 z-30 bg-navy-card px-3 text-left text-[10px] uppercase tracking-wide text-brand-muted w-10">#</th>
            <th rowspan="2" class="sticky top-0 left-10 z-30 bg-navy-card px-3 text-left text-[10px] uppercase tracking-wide text-brand-muted min-w-[200px]">Member</th>
            <th *ngFor="let g of groups" [attr.colspan]="g.items.length" [class]="'sticky top-0 z-20 py-2 text-center text-[10px] uppercase tracking-wide font-bold ' + head(g.color)">{{ g.name }}</th>
          </tr>
          <tr>
            <th *ngFor="let o of flat" [class]="'sticky top-[33px] z-20 px-2 py-1.5 text-center font-semibold min-w-[56px] ' + head(o.color)">
              <button (click)="toggleColumn(o)" [disabled]="!canMark || isFuture(o)" class="leading-tight disabled:cursor-default"
                      [title]="canMark ? 'Click to check / uncheck everyone for this date' : ''">
                <span class="block text-xs" [class.underline]="o.date === today">{{ day(o.date) }}</span>
                <span class="block text-[9px] opacity-70">{{ wd(o.date) }}</span>
              </button>
              <span *ngIf="o.department" class="block text-[9px] opacity-80 uppercase">{{ o.department.slug }}</span>
              <button *ngIf="canManage && o.kind === 'custom' && o.serviceId" (click)="askRemove(o)" class="block mx-auto text-[10px] opacity-60 hover:opacity-100" title="Remove this meeting date">✕</button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of visible; let i = index; trackBy: trackMember" class="hover:bg-navy-input/40">
            <td class="sticky left-0 z-10 bg-navy px-3 py-2 text-brand-muted border-t border-brand-border">{{ i + 1 }}</td>
            <td class="sticky left-10 z-10 bg-navy px-3 py-2 border-t border-brand-border whitespace-nowrap">
              <span class="text-white font-medium">{{ m.firstName }} {{ m.lastName }}</span>
              <span *ngIf="!departmentId && m.department" class="block text-[10px] text-brand-muted">{{ m.department.name }}</span>
            </td>
            <td *ngFor="let o of flat" [class]="'px-2 py-2 text-center border-t border-brand-border ' + (o.date === today ? 'bg-yellow-400/5' : '')">
              <input *ngIf="applies(m, o)" type="checkbox" class="accent-gold w-4 h-4" [checked]="marked.has(cell(m, o))"
                     [disabled]="!editable(m, o)" (change)="toggle(m, o)" />
              <span *ngIf="!applies(m, o)" class="text-brand-muted/40">–</span>
            </td>
          </tr>
          <tr *ngIf="!visible.length"><td [attr.colspan]="flat.length + 2" class="py-8 text-center text-brand-muted text-sm">No members match.</td></tr>
        </tbody>
      </table>
    </div>

    <div *ngIf="data" class="flex items-center justify-between mt-4">
      <div class="text-xs text-brand-muted">
        Present: <b class="text-brand-green">{{ present }}</b> &nbsp; Rate: <b class="text-gold-light">{{ rate }}%</b>
        <span *ngIf="changes" class="ml-3 text-gold-light">● {{ changes }} unsaved change{{ changes === 1 ? '' : 's' }}</span>
      </div>
      <div *ngIf="canMark" class="w-36"><app-button (click)="save()" [disabled]="!changes || saving">{{ saving ? 'Saving…' : 'Save' }}</app-button></div>
    </div>

    <!-- add meeting date -->
    <div *ngIf="addOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="addMeeting()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm">
        <h3 class="text-white font-bold mb-1">Add meeting date</h3>
        <p class="text-xs text-brand-muted mb-4">Set the date of your ministry's meeting. Once added, it appears as a column and your members are listed to check.</p>

        <label class="lbl">Meeting</label>
        <select [(ngModel)]="addForm.typeId" name="typeId" (ngModelChange)="addForm.departmentId = ''" class="inp mb-3">
          <option *ngFor="let t of customTypes" [value]="t._id">{{ t.name }}</option>
        </select>

        <ng-container *ngIf="!departmentId">
          <label class="lbl">Ministry</label>
          <select [(ngModel)]="addForm.departmentId" name="departmentId" class="inp mb-3">
            <option value="">{{ deptOptions().length ? 'Choose ministry' : 'All ministries' }}</option>
            <option *ngFor="let d of deptOptions()" [value]="d._id">{{ d.name }}</option>
          </select>
        </ng-container>

        <label class="lbl">Date</label>
        <input type="date" [(ngModel)]="addForm.date" name="date" required class="inp mb-3" />

        <label class="flex items-start gap-2 text-sm text-brand-muted mb-4 cursor-pointer">
          <input type="checkbox" [(ngModel)]="addForm.repeat" name="repeat" class="accent-gold mt-0.5" />
          <span>Repeat every month on this day (next 12 months)</span>
        </label>

        <p *ngIf="addError" class="text-brand-error text-sm mb-3">{{ addError }}</p>
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="addOpen = false">Cancel</app-button>
          <app-button type="submit" [disabled]="addSaving">{{ addSaving ? 'Saving…' : 'Add' }}</app-button>
        </div>
      </form>
    </div>

    <app-confirmation-modal [open]="confirmClear" title="Clear attendance?" message="This unchecks every box on this page. Nothing is deleted until you press Save."
      confirmLabel="Clear" [danger]="true" (confirmed)="clearAll(); confirmClear = false" (cancelled)="confirmClear = false"></app-confirmation-modal>

    <app-confirmation-modal [open]="!!pendingNav" title="Discard unsaved changes?" message="You have attendance changes that are not saved yet."
      confirmLabel="Discard" [danger]="true" (confirmed)="runPending()" (cancelled)="pendingNav = null"></app-confirmation-modal>

    <app-confirmation-modal [open]="!!removeTarget" title="Remove this meeting date?"
      [message]="'Any attendance already recorded for ' + (removeTarget?.typeName || '') + ' on ' + (removeTarget?.date || '') + ' will be deleted too.'"
      confirmLabel="Remove" [danger]="true" (confirmed)="remove()" (cancelled)="removeTarget = null"></app-confirmation-modal>
  `,
  styles: [`
    .tb { padding: 8px 14px; font-size: 12px; border-radius: 10px; background:#0d1a2e; border:1px solid rgba(255,255,255,0.08); color:#e0e8f5; }
    .tb:hover { border-color: rgba(201,146,42,0.5); }
    .tb-green { color:#22c55e; border-color: rgba(34,197,94,0.35); }
    .tb-red { color:#ff4d6d; border-color: rgba(255,77,109,0.35); }
    .tb-gold { color:#e8b84b; border-color: rgba(232,184,75,0.4); }
    .lbl { display:block; font-size:11px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:#e8b84b; margin-bottom:6px; }
    .inp { width:100%; background:#0d1a2e; border:1px solid rgba(255,255,255,0.08); border-radius:14px; font-size:14px; padding:12px 16px; color:#e0e8f5; outline:none; }
  `]
})
export class ServiceAttendanceComponent implements OnChanges {
  private api = inject(AttendanceBoardService);
  private deptApi = inject(DepartmentService);

  @Input() departmentId = '';   // '' = every ministry (admin view)
  @Input() canMark = false;     // tick boxes + Save
  @Input() canManage = false;   // add / remove meeting dates

  today = localIso();
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  loading = true; saving = false; error = ''; notice = '';
  search = '';

  data: BoardMonth | null = null;
  visible: BoardMember[] = [];
  groups: Group[] = [];
  flat: Occurrence[] = [];
  customTypes: BoardMonth['types'] = [];
  marked = new Set<string>();
  base = new Set<string>();
  typeStats: { name: string; color: string; avg: number | null }[] = [];
  present = 0; rate = 0; changes = 0;

  confirmClear = false;
  pendingNav: (() => void) | null = null;
  removeTarget: Occurrence | null = null;

  addOpen = false; addSaving = false; addError = '';
  addForm = { typeId: '', departmentId: '', date: '', repeat: false };
  allDepartments: DepartmentRecord[] = [];

  get monthName(): string { return MONTH_NAMES[this.month - 1]; }
  head(c: string): string { return HEAD[c] || HEAD['gold']; }
  chip(c: string): string { return CHIP[c] || CHIP['gold']; }
  day(d: string): number { return dayOf(d); }
  wd(d: string): string { return weekdayShort(d); }
  trackMember = (_: number, m: BoardMember) => m._id;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departmentId']) { this.search = ''; this.load(); }
  }

  // ---- loading
  load(): void {
    this.loading = true; this.error = '';
    const params: Record<string, string> = { year: String(this.year), month: String(this.month) };
    if (this.departmentId) params['department'] = this.departmentId;
    this.api.month(params).subscribe({
      next: (r) => {
        this.data = r;
        this.customTypes = r.types.filter((t) => t.kind === 'custom');
        this.flat = r.occurrences;
        this.groups = [];
        for (const o of r.occurrences) {
          const last = this.groups[this.groups.length - 1];
          if (last && last.typeId === o.typeId) last.items.push(o);
          else this.groups.push({ typeId: o.typeId, name: o.typeName, color: o.color, items: [o] });
        }
        this.base = new Set<string>();
        for (const [memberId, byKey] of Object.entries(r.marks)) {
          for (const [key, status] of Object.entries(byKey)) if (COUNTED.includes(status)) this.base.add(`${memberId}|${key}`);
        }
        this.marked = new Set(this.base);
        this.applyFilter();
        this.recompute();
        this.loading = false;
      },
      error: (e) => { this.error = e.error?.message || 'Could not load attendance.'; this.loading = false; }
    });
  }

  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    const all = this.data?.members || [];
    this.visible = q ? all.filter((m) => `${m.firstName} ${m.lastName} ${m.memberId}`.toLowerCase().includes(q)) : all;
  }

  // ---- month navigation (asks first if there are unsaved changes)
  go(delta: number): void {
    const move = () => { const n = shiftMonth(this.year, this.month, delta); this.year = n.year; this.month = n.month; this.notice = ''; this.load(); };
    if (this.changes) this.pendingNav = move; else move();
  }
  runPending(): void { const fn = this.pendingNav; this.pendingNav = null; fn?.(); }

  // ---- cells
  cell(m: BoardMember, o: Occurrence): string { return `${m._id}|${o.key}`; }
  applies(m: BoardMember, o: Occurrence): boolean { return o.departmentIds.length === 0 || (!!m.department && o.departmentIds.includes(m.department._id)); }
  isFuture(o: Occurrence): boolean { return o.date > this.today; }
  editable(m: BoardMember, o: Occurrence): boolean { return this.canMark && this.applies(m, o) && !this.isFuture(o); }

  toggle(m: BoardMember, o: Occurrence): void {
    if (!this.editable(m, o)) return;
    const k = this.cell(m, o);
    if (this.marked.has(k)) this.marked.delete(k); else this.marked.add(k);
    this.recompute();
  }

  toggleColumn(o: Occurrence): void {
    const rows = this.visible.filter((m) => this.editable(m, o));
    if (!rows.length) return;
    const allOn = rows.every((m) => this.marked.has(this.cell(m, o)));
    for (const m of rows) { if (allOn) this.marked.delete(this.cell(m, o)); else this.marked.add(this.cell(m, o)); }
    this.recompute();
  }

  markAll(): void {
    for (const o of this.flat) for (const m of this.visible) if (this.editable(m, o)) this.marked.add(this.cell(m, o));
    this.recompute();
  }
  clearAll(): void {
    for (const o of this.flat) for (const m of this.visible) if (this.editable(m, o)) this.marked.delete(this.cell(m, o));
    this.recompute();
  }
  // Fill empty columns from the column before it (same service, previous week).
  copyPrevious(): void {
    for (const g of this.groups) {
      if (g.items[0]?.kind !== 'weekly') continue;
      for (let i = 1; i < g.items.length; i++) {
        const o = g.items[i], prev = g.items[i - 1];
        if (this.isFuture(o)) continue;
        const hasAny = (this.data?.members || []).some((m) => this.marked.has(this.cell(m, o)));
        if (hasAny) continue;
        for (const m of this.visible) if (this.editable(m, o) && this.marked.has(this.cell(m, prev))) this.marked.add(this.cell(m, o));
      }
    }
    this.recompute();
  }

  // ---- numbers
  recompute(): void {
    const members = this.data?.members || [];
    const per = new Map<string, { sum: number; n: number }>();
    let present = 0, possible = 0;
    for (const o of this.flat) {
      if (this.isFuture(o)) continue;
      let applicable = 0, checked = 0;
      for (const m of members) if (this.applies(m, o)) { applicable++; if (this.marked.has(this.cell(m, o))) checked++; }
      if (!applicable) continue;
      present += checked; possible += applicable;
      const t = per.get(o.typeId) || { sum: 0, n: 0 };
      t.sum += checked / applicable; t.n++; per.set(o.typeId, t);
    }
    this.present = present;
    this.rate = possible ? Math.round((present / possible) * 1000) / 10 : 0;
    this.typeStats = this.groups.map((g) => {
      const t = per.get(g.typeId);
      return { name: g.name, color: g.color, avg: t && t.n ? Math.round((t.sum / t.n) * 100) : null };
    });
    let c = 0;
    for (const k of this.marked) if (!this.base.has(k)) c++;
    for (const k of this.base) if (!this.marked.has(k)) c++;
    this.changes = c;
  }

  // ---- save
  save(): void {
    if (!this.data || !this.changes) return;
    const cols: SaveColumn[] = [];
    for (const o of this.flat) {
      const marks: SaveColumn['marks'] = [];
      for (const m of this.data.members) {
        const k = this.cell(m, o), on = this.marked.has(k), was = this.base.has(k);
        if (on && !was) marks.push({ member: m._id, status: 'present' });
        else if (!on && was) marks.push({ member: m._id, status: null });
      }
      if (marks.length) cols.push({ typeId: o.typeId, date: o.date, serviceId: o.serviceId, marks });
    }
    this.saving = true; this.error = ''; this.notice = '';
    this.api.save(cols).subscribe({
      next: (r) => { this.saving = false; this.notice = `Saved — ${r.saved} marked, ${r.cleared} cleared.`; this.load(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not save attendance.'; }
    });
  }

  // ---- meeting dates (prayer meetings etc.)
  deptOptions(): { _id: string; name: string }[] {
    const t = this.customTypes.find((x) => x._id === this.addForm.typeId);
    if (t && t.departments.length) return t.departments;
    return this.allDepartments;
  }
  openAdd(): void {
    if (this.changes) { this.error = 'Save your attendance changes first, then add the meeting date.'; return; }
    this.error = '';
    if (!this.allDepartments.length && !this.departmentId) this.deptApi.list().subscribe((d) => (this.allDepartments = d));
    const first = this.today.slice(0, 7) === `${this.year}-${String(this.month).padStart(2, '0')}` ? this.today : `${this.year}-${String(this.month).padStart(2, '0')}-01`;
    this.addForm = { typeId: this.customTypes[0]?._id || '', departmentId: '', date: first, repeat: false };
    this.addError = '';
    this.addOpen = true;
  }
  addMeeting(): void {
    this.addSaving = true; this.addError = '';
    const departmentId = this.departmentId || this.addForm.departmentId || null;
    this.api.addMeeting({ typeId: this.addForm.typeId, date: this.addForm.date, departmentId, repeatMonths: this.addForm.repeat ? 12 : 0 }).subscribe({
      next: (r) => { this.addSaving = false; this.addOpen = false; this.notice = `${r.created} meeting date${r.created === 1 ? '' : 's'} added${r.skipped ? ` (${r.skipped} already existed)` : ''}.`; this.load(); },
      error: (e) => { this.addSaving = false; this.addError = e.error?.message || 'Could not add the date.'; }
    });
  }
  askRemove(o: Occurrence): void {
    if (this.changes) { this.error = 'Save your attendance changes first, then remove the date.'; return; }
    this.error = ''; this.removeTarget = o;
  }
  remove(): void {
    const o = this.removeTarget;
    if (!o?.serviceId) return;
    this.removeTarget = null;
    this.api.deleteMeeting(o.serviceId).subscribe({
      next: () => { this.notice = 'Meeting date removed.'; this.load(); },
      error: (e) => (this.error = e.error?.message || 'Could not remove the date.')
    });
  }

  // ---- export
  exportCsv(): void {
    if (!this.data) return;
    const head = ['#', 'Member ID', 'Member', 'Ministry', ...this.flat.map((o) => `${o.typeName} ${o.date}${o.department ? ' (' + o.department.slug + ')' : ''}`), 'Total present'];
    const rows = this.visible.map((m, i) => {
      let total = 0;
      const cells = this.flat.map((o) => {
        if (!this.applies(m, o)) return '';
        const on = this.marked.has(this.cell(m, o));
        if (on) total++;
        return on ? 1 : 0;
      });
      return [i + 1, m.memberId, `${m.firstName} ${m.lastName}`, m.department?.name || '', ...cells, total];
    });
    downloadCsv(`attendance-${this.year}-${String(this.month).padStart(2, '0')}.csv`, toCsv(head, rows));
  }
}

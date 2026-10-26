import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { MemberRecord } from '../../core/services/member.service';
import { CellgroupReportService, CellgroupReport, ActivityRecord, FundRecord } from '../../core/services/cellgroup-report.service';
import { occupationText, ministryText, statusLabel } from '../../core/utils/member-status';
import { toCsv, downloadCsv } from '../../core/utils/csv';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/common/status-badge.component';
import { StatisticCardComponent } from '../../shared/components/cards/statistic-card.component';
import { ChartCardComponent } from '../../shared/components/charts/chart-card.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { MemberFormComponent } from '../../shared/components/modals/member-form.component';
import { ConfirmationModalComponent } from '../../shared/components/modals/confirmation-modal.component';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const todayIso = () => new Date().toISOString().split('T')[0];

interface MonthRow { month: number; name: string; cur: FundRecord | null; prev: FundRecord | null; }

// The digital "Cell Group Monitoring Report": members by gender, activity log,
// and the monthly MTM Fund — one page per cell group, one year at a time.
@Component({
  selector: 'app-cellgroup-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, StatusBadgeComponent, StatisticCardComponent,
    ChartCardComponent, ButtonComponent, IconComponent, MemberFormComponent, ConfirmationModalComponent],
  template: `
    <a [routerLink]="['/portal', slug, 'cellgroups']" class="text-xs text-brand-muted hover:text-gold-light">← Back to cellgroups</a>

    <div *ngIf="loading" class="text-center py-20 text-brand-muted text-sm">Loading report…</div>
    <p *ngIf="!loading && error" class="text-brand-error text-sm py-10 text-center">{{ error }}</p>

    <ng-container *ngIf="!loading && report as r">
      <app-page-header class="block mt-2" [title]="r.cellgroup.name" [subtitle]="'Cell Group Monitoring Report · ' + r.cellgroup.department.name">
        <div actions class="flex items-center gap-2">
          <select [(ngModel)]="year" (ngModelChange)="load()" name="year"
                  class="bg-navy-input border border-brand-border rounded-brand text-sm py-2.5 px-3 text-brand-text">
            <option *ngFor="let y of yearOptions" [ngValue]="y">{{ y }}</option>
          </select>
          <div class="w-36"><app-button variant="ghost" (click)="exportCsv()">Export CSV</app-button></div>
        </div>
      </app-page-header>
e
      <!-- Leaders -->
      <div class="bg-navy-card border border-brand-border rounded-brand p-5 mb-4 flex flex-wrap items-start justify-between gap-4">
        <div class="grid sm:grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <div><span class="text-brand-muted">Leader: </span><span class="text-white font-medium">{{ r.cellgroup.leaderName || '—' }}</span></div>
          <div><span class="text-brand-muted">Assistant leader(s): </span>
            <span class="text-white font-medium">{{ r.cellgroup.assistantLeaders.length ? r.cellgroup.assistantLeaders.join(', ') : '—' }}</span></div>
        </div>
        <button *ngIf="canEdit" (click)="openLeaders(r)" class="text-xs text-gold-light flex items-center gap-1.5 hover:underline">
          <app-icon name="pencil" [size]="13"></app-icon> Edit leaders
        </button>
      </div>

      <!-- Summary -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <app-statistic-card icon="users" iconBg="bg-purple-500/70" label="Members on roster" [value]="r.summary.roster"></app-statistic-card>
        <app-statistic-card icon="user-check" iconBg="bg-brand-green/70" label="Active" [value]="r.summary.active"
          [sublabel]="r.summary.sundayGoer + ' Sunday goer only'"></app-statistic-card>
        <app-statistic-card icon="user-x" iconBg="bg-brand-error/70" label="Inactive" [value]="r.summary.inactive"
          [sublabel]="r.summary.otherChurch + ' from other church'"></app-statistic-card>
        <app-statistic-card icon="calculator" iconBg="bg-gold/70" [label]="'MTM Fund ' + r.year" [value]="(r.summary.fundTotal | number:'1.0-2') ?? '0'"></app-statistic-card>
        <app-statistic-card icon="clipboard-list" iconBg="bg-blue-500/70" [label]="'Activities in ' + r.year" [value]="r.summary.meetings"></app-statistic-card>
        <app-statistic-card icon="bar-chart-3" iconBg="bg-blue-500/70" label="Average attendance" [value]="r.summary.avgAttendance"></app-statistic-card>
      </div>

      <!-- Members -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-white font-semibold">Members</h2>
        <div *ngIf="canEdit" class="w-40"><app-button (click)="openMember(null)">Add Member</app-button></div>
      </div>
      <p class="text-[11px] text-brand-muted mb-3">Status: Active · <span class="text-yellow-300">Sunday goer only</span> · <span class="text-brand-error">Inactive</span> · <span class="text-blue-400">From other church</span></p>

      <div class="grid lg:grid-cols-2 gap-4 mb-4">
        <ng-container *ngTemplateOutlet="memberTable; context: { title: 'Male Members', list: r.members.male }"></ng-container>
        <ng-container *ngTemplateOutlet="memberTable; context: { title: 'Female Members', list: r.members.female }"></ng-container>
      </div>
      <div *ngIf="r.members.unspecified.length" class="mb-4">
        <ng-container *ngTemplateOutlet="memberTable; context: { title: 'Gender not set', list: r.members.unspecified }"></ng-container>
      </div>

      <ng-template #memberTable let-title="title" let-list="list">
        <app-chart-card [title]="title + ' (' + list.length + ')'">
          <p *ngIf="!list.length" class="text-brand-muted text-sm">No members listed.</p>
          <div *ngIf="list.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-brand-muted text-xs uppercase tracking-wide text-left">
                  <th class="pb-2 pr-3 font-medium">Name</th><th class="pb-2 pr-3 font-medium">Age</th>
                  <th class="pb-2 pr-3 font-medium">Location</th><th class="pb-2 pr-3 font-medium">Status</th>
                  <th class="pb-2 pr-3 font-medium">Ministry</th><th class="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of list" class="border-t border-brand-border align-top">
                  <td class="py-2 pr-3 text-white">{{ m.firstName }} {{ m.lastName }}</td>
                  <td class="py-2 pr-3">{{ m.age ?? '—' }}</td>
                  <td class="py-2 pr-3">{{ m.location || '—' }}</td>
                  <td class="py-2 pr-3">
                    <app-status-badge [status]="m.status"></app-status-badge>
                    <p *ngIf="occupation(m)" class="text-[11px] text-brand-muted mt-1">{{ occupation(m) }}</p>
                  </td>
                  <td class="py-2 pr-3">{{ ministry(m) }}</td>
                  <td class="py-2 text-right">
                    <button *ngIf="canEdit" (click)="openMember(m)" class="text-brand-muted hover:text-gold-light"><app-icon name="pencil" [size]="14"></app-icon></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </app-chart-card>
      </ng-template>

      <!-- Activity log -->
      <div class="flex items-center justify-between mt-8 mb-3">
        <h2 class="text-white font-semibold">Activity log — {{ r.year }}</h2>
        <div *ngIf="canEdit" class="w-44"><app-button (click)="openActivity(null)">Add Activity</app-button></div>
      </div>
      <div class="bg-navy-card border border-brand-border rounded-brand overflow-x-auto mb-8">
        <p *ngIf="!r.activities.length" class="text-brand-muted text-sm text-center py-10">No activities logged for {{ r.year }} yet.</p>
        <table *ngIf="r.activities.length" class="w-full text-sm">
          <thead>
            <tr class="bg-navy-input text-brand-muted text-xs uppercase tracking-wide text-left">
              <th class="px-4 py-3 font-medium">Date</th><th class="px-4 py-3 font-medium">Type of activity</th>
              <th class="px-4 py-3 font-medium">No. attendees</th><th class="px-4 py-3 font-medium">Members absent</th>
              <th class="px-4 py-3 font-medium">Remarks / assessment</th><th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of r.activities" class="border-t border-brand-border align-top">
              <td class="px-4 py-3 whitespace-nowrap">{{ a.date | date:'d-MMM-yyyy' }}</td>
              <td class="px-4 py-3">{{ a.type }}</td>
              <td class="px-4 py-3">{{ a.attendeeCount }}</td>
              <td class="px-4 py-3">{{ absentNames(a) }}</td>
              <td class="px-4 py-3 text-brand-muted">{{ a.remarks || '—' }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <ng-container *ngIf="canEdit">
                  <button (click)="openActivity(a)" class="text-brand-muted hover:text-gold-light mr-3"><app-icon name="pencil" [size]="14"></app-icon></button>
                  <button (click)="delTarget = a" class="text-brand-muted hover:text-brand-error"><app-icon name="trash-2" [size]="14"></app-icon></button>
                </ng-container>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Financials -->
      <h2 class="text-white font-semibold mb-3">Financials — MTM Fund</h2>
      <div class="bg-navy-card border border-brand-border rounded-brand overflow-x-auto mb-8">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-navy-input text-brand-muted text-xs uppercase tracking-wide text-left">
              <th class="px-4 py-3 font-medium">Month</th>
              <th class="px-4 py-3 font-medium">MTM Fund {{ r.year }}</th>
              <th class="px-4 py-3 font-medium">Date submitted</th>
              <th class="px-4 py-3 font-medium">Remarks</th>
              <th class="px-4 py-3 font-medium">{{ r.year - 1 }} (for comparison)</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of monthRows" class="border-t border-brand-border">
              <td class="px-4 py-2.5">{{ row.name }}</td>
              <td class="px-4 py-2.5 text-white">{{ row.cur ? (row.cur.amount | number:'1.0-2') : '—' }}</td>
              <td class="px-4 py-2.5">{{ row.cur?.dateSubmitted ? (row.cur!.dateSubmitted | date:'MMM d, y') : '—' }}</td>
              <td class="px-4 py-2.5 text-brand-muted">{{ row.cur?.remarks || '—' }}</td>
              <td class="px-4 py-2.5 text-brand-muted">{{ row.prev ? (row.prev.amount | number:'1.0-2') : '—' }}</td>
              <td class="px-4 py-2.5 text-right">
                <button *ngIf="canEdit" (click)="openFund(row)" class="text-brand-muted hover:text-gold-light"><app-icon name="pencil" [size]="14"></app-icon></button>
              </td>
            </tr>
            <tr class="border-t-2 border-brand-border font-semibold">
              <td class="px-4 py-3">TOTAL</td>
              <td class="px-4 py-3 text-gold-light">{{ totals.cur | number:'1.0-2' }}</td>
              <td></td><td></td>
              <td class="px-4 py-3 text-brand-muted">{{ totals.prev | number:'1.0-2' }}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Member add/edit -->
      <app-member-form [open]="memberFormOpen" [member]="editingMember" [fixedDepartmentId]="r.cellgroup.department._id"
        [presetCellgroupId]="r.cellgroup._id" (saved)="memberFormOpen = false; load()" (closed)="memberFormOpen = false"></app-member-form>

      <!-- Leaders modal -->
      <div *ngIf="leadOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <form (ngSubmit)="saveLeaders()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm">
          <h3 class="text-white font-bold mb-4">Cell group leaders</h3>
          <label class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">Leader</label>
          <input [(ngModel)]="leadForm.leaderName" name="leaderName" class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <label class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">Assistant leaders (one per line)</label>
          <textarea [(ngModel)]="leadForm.assistants" name="assistants" rows="3" class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none"></textarea>
          <p *ngIf="leadError" class="text-brand-error text-sm mb-3">{{ leadError }}</p>
          <div class="flex gap-3">
            <app-button variant="ghost" (click)="leadOpen = false">Cancel</app-button>
            <app-button type="submit" [disabled]="leadSaving">{{ leadSaving ? 'Saving…' : 'Save' }}</app-button>
          </div>
        </form>
      </div>

      <!-- Activity modal -->
      <div *ngIf="actOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <form (ngSubmit)="saveActivity()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 class="text-white font-bold mb-4">{{ actEditing ? 'Edit activity' : 'Add activity' }}</h3>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <input type="date" [(ngModel)]="actForm.date" name="date" required class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
            <select [(ngModel)]="actForm.type" name="type" class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-3 text-brand-text">
              <option *ngFor="let t of r.activityTypes" [value]="t">{{ t }}</option>
            </select>
          </div>

          <label class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">Members absent</label>
          <div class="max-h-40 overflow-y-auto bg-navy-input border border-brand-border rounded-brand p-3 mb-3 space-y-1.5">
            <p *ngIf="!roster.length" class="text-brand-muted text-xs">No members on the roster yet.</p>
            <label *ngFor="let m of roster" class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" class="accent-gold" [checked]="isAbsent(m._id)" (change)="toggleAbsent(m._id)" />
              {{ m.firstName }} {{ m.lastName }}
            </label>
          </div>

          <label class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">No. of attendees (include visitors)</label>
          <input type="number" min="0" [(ngModel)]="actForm.attendeeCount" (ngModelChange)="attendeeTouched = true" name="attendeeCount" required
                 class="w-full mb-1 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <p class="text-[11px] text-brand-muted mb-3">Suggested from the roster minus those marked absent; change it if visitors joined.</p>

          <textarea [(ngModel)]="actForm.remarks" name="remarks" rows="3" placeholder="Remarks / assessment"
                    class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none"></textarea>
          <p *ngIf="actError" class="text-brand-error text-sm mb-3">{{ actError }}</p>
          <div class="flex gap-3">
            <app-button variant="ghost" (click)="actOpen = false">Cancel</app-button>
            <app-button type="submit" [disabled]="actSaving">{{ actSaving ? 'Saving…' : 'Save' }}</app-button>
          </div>
        </form>
      </div>

      <!-- Fund modal -->
      <div *ngIf="fundOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <form (ngSubmit)="saveFund()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm">
          <h3 class="text-white font-bold mb-4">MTM Fund — {{ monthName(fundForm.month) }} {{ r.year }}</h3>
          <input type="number" min="0" step="0.01" [(ngModel)]="fundForm.amount" name="amount" placeholder="Amount"
                 class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <label class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">Date submitted</label>
          <input type="date" [(ngModel)]="fundForm.dateSubmitted" name="dateSubmitted"
                 class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <input [(ngModel)]="fundForm.remarks" name="remarks" placeholder="Remarks"
                 class="w-full mb-1 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <p class="text-[11px] text-brand-muted mb-4">Leave the amount empty and save to clear this month.</p>
          <p *ngIf="fundError" class="text-brand-error text-sm mb-3">{{ fundError }}</p>
          <div class="flex gap-3">
            <app-button variant="ghost" (click)="fundOpen = false">Cancel</app-button>
            <app-button type="submit" [disabled]="fundSaving">{{ fundSaving ? 'Saving…' : 'Save' }}</app-button>
          </div>
        </form>
      </div>

      <app-confirmation-modal [open]="!!delTarget" title="Delete this activity?"
        message="The log entry is removed permanently." confirmLabel="Delete" [danger]="true"
        (confirmed)="removeActivity()" (cancelled)="delTarget = null"></app-confirmation-modal>
    </ng-container>
  `
})
export class CellgroupReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(CellgroupReportService);
  private auth = inject(AuthService);
  private permissions = inject(PermissionsService);

  id = '';
  slug = '';
  canEdit = this.permissions.canManage(this.auth.user());
  year = new Date().getFullYear();
  yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i);

  report: CellgroupReport | null = null;
  roster: MemberRecord[] = [];
  monthRows: MonthRow[] = [];
  totals = { cur: 0, prev: 0 };
  loading = true;
  error = '';

  // members
  memberFormOpen = false;
  editingMember: MemberRecord | null = null;

  // leaders
  leadOpen = false; leadSaving = false; leadError = '';
  leadForm = { leaderName: '', assistants: '' };

  // activities
  actOpen = false; actSaving = false; actError = '';
  actEditing: ActivityRecord | null = null;
  actForm: { date: string; type: string; attendeeCount: number | string; remarks: string } = { date: '', type: '', attendeeCount: 0, remarks: '' };
  actAbsent: string[] = [];
  attendeeTouched = false;
  delTarget: ActivityRecord | null = null;

  // funds
  fundOpen = false; fundSaving = false; fundError = '';
  fundForm: { month: number; amount: number | string | null; dateSubmitted: string; remarks: string } = { month: 1, amount: '', dateSubmitted: '', remarks: '' };

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.slug = this.route.parent?.snapshot.paramMap.get('slug') || '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.get(this.id, this.year).subscribe({
      next: (r) => {
        this.report = r;
        this.roster = [...r.members.male, ...r.members.female, ...r.members.unspecified];
        this.buildMonths();
        this.loading = false;
      },
      error: (e) => { this.error = e.error?.message || 'Could not load this report.'; this.loading = false; }
    });
  }

  private buildMonths(): void {
    const funds = this.report?.funds || [];
    const find = (y: number, m: number) => funds.find((f) => f.year === y && f.month === m) || null;
    this.monthRows = MONTHS.map((name, i) => ({ month: i + 1, name, cur: find(this.year, i + 1), prev: find(this.year - 1, i + 1) }));
    this.totals = {
      cur: this.monthRows.reduce((a, r) => a + (r.cur?.amount || 0), 0),
      prev: this.monthRows.reduce((a, r) => a + (r.prev?.amount || 0), 0)
    };
  }

  occupation(m: MemberRecord): string { return occupationText(m); }
  ministry(m: MemberRecord): string { return ministryText(m); }
  monthName(n: number): string { return MONTHS[n - 1] || ''; }
  absentNames(a: ActivityRecord): string {
    return a.absentMembers.length ? a.absentMembers.map((m) => `${m.firstName} ${m.lastName}`).join(', ') : '—';
  }

  // ---- members
  openMember(m: MemberRecord | null): void { this.editingMember = m; this.memberFormOpen = true; }

  // ---- leaders
  openLeaders(r: CellgroupReport): void {
    this.leadForm = { leaderName: r.cellgroup.leaderName, assistants: r.cellgroup.assistantLeaders.join('\n') };
    this.leadError = '';
    this.leadOpen = true;
  }
  saveLeaders(): void {
    this.leadSaving = true; this.leadError = '';
    const assistantLeaders = this.leadForm.assistants.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    this.api.updateLeaders(this.id, { leaderName: this.leadForm.leaderName.trim(), assistantLeaders }).subscribe({
      next: () => { this.leadSaving = false; this.leadOpen = false; this.load(); },
      error: (e) => { this.leadSaving = false; this.leadError = e.error?.message || 'Could not save'; }
    });
  }

  // ---- activities
  openActivity(a: ActivityRecord | null): void {
    this.actEditing = a;
    this.actError = '';
    if (a) {
      this.actForm = { date: a.date, type: a.type, attendeeCount: a.attendeeCount, remarks: a.remarks };
      this.actAbsent = a.absentMembers.map((m) => m._id);
      this.attendeeTouched = true; // keep the saved number when editing
    } else {
      this.actForm = { date: todayIso(), type: this.report?.activityTypes[0] || '', attendeeCount: 0, remarks: '' };
      this.actAbsent = [];
      this.attendeeTouched = false;
      this.suggestAttendees();
    }
    this.actOpen = true;
  }
  isAbsent(id: string): boolean { return this.actAbsent.includes(id); }
  toggleAbsent(id: string): void {
    this.actAbsent = this.isAbsent(id) ? this.actAbsent.filter((x) => x !== id) : [...this.actAbsent, id];
    this.suggestAttendees();
  }
  private suggestAttendees(): void {
    if (this.attendeeTouched) return;
    const expected = this.roster.filter((m) => m.status !== 'inactive').length;
    this.actForm.attendeeCount = Math.max(expected - this.actAbsent.length, 0);
  }
  saveActivity(): void {
    this.actSaving = true; this.actError = '';
    const payload = { ...this.actForm, attendeeCount: Number(this.actForm.attendeeCount), absentMembers: this.actAbsent };
    const req = this.actEditing ? this.api.updateActivity(this.actEditing._id, payload) : this.api.addActivity(this.id, payload);
    req.subscribe({
      next: () => { this.actSaving = false; this.actOpen = false; this.load(); },
      error: (e) => { this.actSaving = false; this.actError = e.error?.message || 'Could not save activity'; }
    });
  }
  removeActivity(): void {
    if (!this.delTarget) return;
    this.api.deleteActivity(this.delTarget._id).subscribe(() => { this.delTarget = null; this.load(); });
  }

  // ---- funds
  openFund(row: MonthRow): void {
    this.fundForm = {
      month: row.month,
      amount: row.cur ? row.cur.amount : '',
      dateSubmitted: row.cur?.dateSubmitted || '',
      remarks: row.cur?.remarks || ''
    };
    this.fundError = '';
    this.fundOpen = true;
  }
  saveFund(): void {
    this.fundSaving = true; this.fundError = '';
    this.api.saveFund(this.id, { year: this.year, ...this.fundForm }).subscribe({
      next: () => { this.fundSaving = false; this.fundOpen = false; this.load(); },
      error: (e) => { this.fundSaving = false; this.fundError = e.error?.message || 'Could not save'; }
    });
  }

  // ---- export
  exportCsv(): void {
    const r = this.report;
    if (!r) return;
    const memberRows = (list: MemberRecord[]) =>
      list.map((m) => [`${m.firstName} ${m.lastName}`, m.age ?? '', m.location || '', statusLabel(m.status), occupationText(m), ministryText(m)]);
    const memberHead = ['Name', 'Age', 'Location', 'Status', 'Student / Working', 'Ministry'];

    const parts = [
      toCsv([`Cell Group Monitoring Report ${r.year}`, r.cellgroup.name], [
        ['Leader', r.cellgroup.leaderName], ['Assistant leaders', r.cellgroup.assistantLeaders.join('; ')]
      ]),
      toCsv(['MALE MEMBERS'], []), toCsv(memberHead, memberRows(r.members.male)),
      toCsv(['FEMALE MEMBERS'], []), toCsv(memberHead, memberRows(r.members.female)),
      ...(r.members.unspecified.length ? [toCsv(['GENDER NOT SET'], []), toCsv(memberHead, memberRows(r.members.unspecified))] : []),
      toCsv(['ACTIVITY LOG'], []),
      toCsv(['Date', 'Type of activity', 'No. attendees', 'Members absent', 'Remarks / assessment'],
        r.activities.map((a) => [a.date, a.type, a.attendeeCount, this.absentNames(a) === '—' ? '' : this.absentNames(a), a.remarks])),
      toCsv([`MTM FUND ${r.year}`], []),
      toCsv(['Month', 'MTM Fund', 'Date submitted', 'Remarks', `${r.year - 1} MTM Fund`], [
        ...this.monthRows.map((m) => [m.name, m.cur?.amount ?? '', m.cur?.dateSubmitted || '', m.cur?.remarks || '', m.prev?.amount ?? '']),
        ['TOTAL', this.totals.cur, '', '', this.totals.prev]
      ])
    ];
    const safe = r.cellgroup.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    downloadCsv(`cellgroup-${safe}-${r.year}.csv`, parts.join('\r\n\r\n'));
  }
}

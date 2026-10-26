import { Component, OnInit, Injector, effect, inject, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentStore } from '../../core/services/department-store.service';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { ReportService, AttendanceReport } from '../../core/services/report.service';
import { toCsv, downloadCsv } from '../../core/utils/csv';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { StatisticCardComponent } from '../../shared/components/cards/statistic-card.component';
import { ChartCardComponent } from '../../shared/components/charts/chart-card.component';
import { LineChartComponent } from '../../shared/components/charts/line-chart.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';

const iso = (d: Date) => d.toISOString().split('T')[0];

// Used in a portal (scoped to its department) and in admin (all / pick one).
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatisticCardComponent, ChartCardComponent, LineChartComponent, DataTableComponent, ButtonComponent],
  template: `
    <app-page-header title="Reports" [subtitle]="scopeName + ' attendance and exports'">
      <div actions class="flex gap-2">
        <div class="w-40"><app-button variant="ghost" (click)="exportMembers()">Export Members</app-button></div>
        <div class="w-44"><app-button variant="ghost" (click)="exportAttendance()" [disabled]="!report?.data?.length">Export Attendance</app-button></div>
      </div>
    </app-page-header>

    <div class="flex flex-wrap gap-3 mb-5 items-center">
      <label class="text-xs text-brand-muted">From <input type="date" [(ngModel)]="from" (ngModelChange)="load()" class="ml-1 bg-navy-input border border-brand-border rounded-brand text-sm py-2 px-3 text-brand-text outline-none" /></label>
      <label class="text-xs text-brand-muted">To <input type="date" [(ngModel)]="to" (ngModelChange)="load()" class="ml-1 bg-navy-input border border-brand-border rounded-brand text-sm py-2 px-3 text-brand-text outline-none" /></label>
      <select *ngIf="!scoped" [(ngModel)]="departmentId" (ngModelChange)="load()" class="bg-navy-input border border-brand-border rounded-brand text-sm py-2 px-3 text-brand-text">
        <option value="">All departments</option>
        <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
      </select>
    </div>

    <div *ngIf="loading" class="text-center py-12 text-brand-muted text-sm">Loading…</div>

    <ng-container *ngIf="!loading && report">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <app-statistic-card icon="users" iconBg="bg-purple-500/70" label="Members on roster" [value]="report.summary.totalMembers"></app-statistic-card>
        <app-statistic-card icon="clipboard-check" iconBg="bg-blue-500/70" label="Services recorded" [value]="report.summary.services"></app-statistic-card>
        <app-statistic-card icon="bar-chart-3" iconBg="bg-brand-green/70" label="Average attendance" [value]="report.summary.avgRate + '%'"></app-statistic-card>
        <app-statistic-card icon="shield-check" iconBg="bg-gold/70" label="Best / lowest"
          [value]="report.summary.best ? report.summary.best.rate + '% / ' + report.summary.lowest!.rate + '%' : '—'"
          [sublabel]="report.summary.best ? report.summary.best.date : ''"></app-statistic-card>
      </div>

      <app-chart-card title="Attendance rate by service" extraClass="mb-6">
        <app-line-chart *ngIf="chartPoints.length > 1; else few" [points]="chartPoints"></app-line-chart>
        <ng-template #few><p class="text-brand-muted text-sm text-center py-12">Record attendance for at least two services to see the trend.</p></ng-template>
      </app-chart-card>

      <app-data-table [columns]="columns" [rows]="report.data" emptyLabel="No attendance recorded in this date range"></app-data-table>
    </ng-container>
  `
})
export class ReportsComponent implements OnInit {
  private store = inject(DepartmentStore, { optional: true });
  private injector = inject(Injector);
  private deptApi = inject(DepartmentService);
  private reportApi = inject(ReportService);

  scoped = !!this.store;
  departments: DepartmentRecord[] = [];
  departmentId = '';
  from = iso(new Date(Date.now() - 90 * 86400000));
  to = iso(new Date());
  report: AttendanceReport | null = null;
  loading = true;

  columns: TableColumn[] = [
    { key: 'date', label: 'Service date' },
    { key: 'present', label: 'Present' },
    { key: 'late', label: 'Late' },
    { key: 'absent', label: 'Absent' },
    { key: 'excused', label: 'Excused' },
    { key: 'rate', label: 'Rate', badge: (r) => ({ status: r.rate >= 80 ? 'active' : r.rate >= 50 ? 'late' : 'absent', label: r.rate + '%' }) }
  ];

  get scopeName(): string {
    if (this.store) return this.store.department()?.name || '';
    return this.departments.find((d) => d._id === this.departmentId)?.name || 'All departments —';
  }

  // chart wants oldest -> newest
  get chartPoints() { return [...(this.report?.data || [])].reverse(); }

  ngOnInit(): void {
    if (!this.store) {
      this.deptApi.list().subscribe((d) => (this.departments = d));
      this.load();
      return;
    }
    runInInjectionContext(this.injector, () => {
      effect(() => { if (this.store!.department()) this.load(); }, { allowSignalWrites: true });
    });
  }

  private scopeId(): string { return this.store ? this.store.department()?._id || '' : this.departmentId; }

  load(): void {
    this.loading = true;
    const params: Record<string, string> = {};
    if (this.scopeId()) params['department'] = this.scopeId();
    if (this.from) params['from'] = this.from;
    if (this.to) params['to'] = this.to;
    this.reportApi.attendance(params).subscribe({
      next: (r) => { this.report = r; this.loading = false; },
      error: () => (this.loading = false)
    });
  }

  exportAttendance(): void {
    if (!this.report) return;
    const csv = toCsv(
      ['Service date', 'Present', 'Late', 'Absent', 'Excused', 'Roster size', 'Rate %'],
      this.report.data.map((r) => [r.date, r.present, r.late, r.absent, r.excused, r.totalMembers, r.rate])
    );
    downloadCsv(`attendance-${this.from}_to_${this.to}.csv`, csv);
  }

  exportMembers(): void {
    const params: Record<string, string> = this.scopeId() ? { department: this.scopeId() } : {};
    this.reportApi.members(params).subscribe((members) => {
      const csv = toCsv(
        ['Member ID', 'First name', 'Last name', 'Department', 'Cellgroup', 'Contact', 'Email', 'Status', 'Date joined'],
        members.map((m) => [m.memberId, m.firstName, m.lastName, m.department?.name, m.cellgroup?.name, m.contact, m.email, m.status, (m.dateJoined || '').split('T')[0]])
      );
      downloadCsv('members.csv', csv);
    });
  }
}

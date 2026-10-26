import { Component, Injector, OnInit, effect, inject, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentStore } from '../../core/services/department-store.service';
import { MemberService, MemberStats } from '../../core/services/member.service';
import { CellgroupService } from '../../core/services/cellgroup.service';
import { VisitorService } from '../../core/services/visitor.service';
import { ServiceService } from '../../core/services/service.service';
import { ActivityService } from '../../core/services/activity.service';
import { MemberAttendanceService, AttendanceOverviewPoint, CellgroupBreakdownRow } from '../../core/services/member-attendance.service';
import { StatisticCardComponent } from '../../shared/components/cards/statistic-card.component';
import { ChartCardComponent } from '../../shared/components/charts/chart-card.component';
import { LineChartComponent } from '../../shared/components/charts/line-chart.component';
import { DonutChartComponent, DonutSlice } from '../../shared/components/charts/donut-chart.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';

const todayStr = () => new Date().toISOString().split('T')[0];

// One dashboard for every portal — only the department (from DepartmentStore) changes.
@Component({
  selector: 'app-portal-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatisticCardComponent, ChartCardComponent, LineChartComponent, DonutChartComponent, DataTableComponent],
  template: `
    <div *ngIf="store.loading() || loading" class="text-center py-20 text-brand-muted">Loading portal…</div>

    <div *ngIf="!store.loading() && !loading">
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-xl font-bold text-white">Welcome back, {{ auth.user()?.firstName }}! 👋</h1>
          <p class="text-sm text-brand-muted mt-0.5">Here's what's happening in {{ store.department()?.name }} today.</p>
        </div>
        <div class="text-sm text-brand-muted">
          Today is {{ today | date: 'EEEE, MMMM d, y' }}
          <span *ngIf="service" class="ml-2 text-gold-light">· {{ service.name }}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <app-statistic-card icon="users" iconBg="bg-purple-500/70" label="Total Members" [value]="stats?.total ?? 0"></app-statistic-card>
        <app-statistic-card icon="user-check" iconBg="bg-brand-green/70" label="Active Members" [value]="stats?.active ?? 0"></app-statistic-card>
        <app-statistic-card icon="user-plus" iconBg="bg-blue-500/70" label="Visitors Today" [value]="visitors.length"></app-statistic-card>
        <app-statistic-card icon="shield-check" iconBg="bg-gold/70" label="Needs Follow-up" [value]="stats?.needsFollowup ?? 0"></app-statistic-card>
        <app-statistic-card icon="user-x" iconBg="bg-brand-error/70" label="Inactive Members" [value]="stats?.inactive ?? 0"></app-statistic-card>
        <app-statistic-card icon="users-round" label="Cellgroups" [value]="cellgroupCount"></app-statistic-card>
      </div>


      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <a *ngFor="let q of quickActions" [routerLink]="['/portal', store.department()!.slug, q.path]"
           class="bg-navy-card border border-brand-border rounded-brand py-3 text-center text-sm text-brand-text hover:border-gold/40 transition-colors">{{ q.label }}</a>
      </div>

      <div class="grid lg:grid-cols-3 gap-4 mb-6">
        <app-chart-card title="Attendance Overview" extraClass="lg:col-span-2">
          <app-line-chart *ngIf="overview.length; else noHistory" [points]="overview"></app-line-chart>
          <ng-template #noHistory>
            <p class="text-brand-muted text-sm text-center py-16">No attendance history yet — check in some members to see this chart fill in.</p>
          </ng-template>
        </app-chart-card>

        <app-chart-card title="Member Status">
          <app-donut-chart *ngIf="stats?.total; else noMembers" [slices]="donut"></app-donut-chart>
          <ng-template #noMembers><p class="text-brand-muted text-sm text-center py-16">No members yet.</p></ng-template>
          <div *ngIf="stats?.total" class="mt-5 pt-4 border-t border-brand-border flex items-center gap-4">
            <div class="relative w-16 h-16 rounded-full shrink-0" [style.background]="'conic-gradient(' + healthColor + ' ' + health + '%, #0d1a2e 0)'">
              <div class="absolute inset-[6px] rounded-full bg-navy-card flex items-center justify-center text-white text-sm font-bold">{{ health }}%</div>
            </div>
            <div><p class="text-xs text-brand-muted">Ministry Health Score</p><p class="font-semibold" [style.color]="healthColor">{{ healthLabel }}</p></div>
          </div>
        </app-chart-card>
      </div>

      <div class="grid lg:grid-cols-2 gap-4 mb-6">
        <app-chart-card title="Today's Attendance by Cellgroup">
          <app-data-table [columns]="breakdownColumns" [rows]="breakdown" emptyLabel="No cellgroup data for today's service yet"></app-data-table>
        </app-chart-card>
        <app-chart-card title="Recently Added Visitors">
          <app-data-table [columns]="visitorColumns" [rows]="visitors" emptyLabel="No visitors registered today"></app-data-table>
        </app-chart-card>
      </div>

      <app-chart-card title="Recent Activity">
        <p *ngIf="!activity.length" class="text-brand-muted text-sm">Nothing yet today.</p>
        <div *ngFor="let a of activity" class="flex items-center justify-between text-sm border-b border-brand-border last:border-0 py-2">
          <span>
            <span class="font-medium">{{ a.userName }}</span>
            <span class="text-brand-muted"> {{ a.action }}d {{ a.module }}</span>
            <span *ngIf="a.details" class="text-brand-muted"> — {{ a.details }}</span>
          </span>
          <span class="text-xs text-brand-muted whitespace-nowrap ml-3">{{ a.createdAt | date: 'shortTime' }}</span>
        </div>
      </app-chart-card>
    </div>
  `
})
export class PortalDashboardComponent implements OnInit {
  auth = inject(AuthService);
  store = inject(DepartmentStore);
  private injector = inject(Injector);
  private members = inject(MemberService);
  private cellgroups = inject(CellgroupService);
  private visitorApi = inject(VisitorService);
  private serviceApi = inject(ServiceService);
  private activityApi = inject(ActivityService);
  private attendanceApi = inject(MemberAttendanceService);

  today = new Date();
  loading = true;
  stats: MemberStats | null = null;
  cellgroupCount = 0;
  visitors: any[] = [];
  activity: any[] = [];
  overview: AttendanceOverviewPoint[] = [];
  breakdown: CellgroupBreakdownRow[] = [];
  service: any = null;
  donut: DonutSlice[] = [];

  quickActions = [
    { label: 'Add Member', path: 'members' },
    { label: 'Add Cellgroup', path: 'cellgroups' },
    { label: 'View Visitors', path: 'visitors' },
    { label: 'Reports', path: 'reports' },
    { label: 'Follow-up List', path: 'followup' }
  ];

  // Health score = share of the roster that is active.
  get health(): number { return this.stats?.total ? Math.round((this.stats.active / this.stats.total) * 100) : 0; }
  get healthLabel(): string { return this.health >= 80 ? 'Healthy' : this.health >= 60 ? 'Needs attention' : 'At risk'; }
  get healthColor(): string { return this.health >= 80 ? '#22c55e' : this.health >= 60 ? '#c9922a' : '#ff4d6d'; }

  breakdownColumns: TableColumn[] = [
    { key: 'name', label: 'Cellgroup', render: (r) => r.cellgroup.name },
    { key: 'ratio', label: 'Present / Total', render: (r) => `${r.present} / ${r.total}` },
    { key: 'rate', label: 'Rate', badge: (r) => ({ status: r.rate >= 80 ? 'active' : r.rate >= 50 ? 'late' : 'absent', label: `${r.rate}%` }) }
  ];
  visitorColumns: TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'cellgroup', label: 'Cellgroup', render: (r) => r.cellgroup?.name || '—' },
    { key: 'status', label: 'Status', badge: (r) => r.firstTime === 'yes' ? { status: 'first_time', label: 'First Time' } : { status: 'returning', label: 'Returning' } }
  ];

  ngOnInit(): void {
    // React to the department finishing its load (signal) — equivalent of the
    // React effect keyed on `department`.
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const dept = this.store.department();
        if (dept) this.loadAll(dept._id);
      }, { allowSignalWrites: true });
    });
  }

  private loadAll(departmentId: string): void {
    this.loading = true;
    const date = todayStr();

    this.serviceApi.today().pipe(catchError(() => of(null))).subscribe((svc) => {
      this.service = svc;
      forkJoin({
        stats: this.members.stats({ department: departmentId }).pipe(catchError(() => of(null))),
        cellgroups: this.cellgroups.list({ department: departmentId }).pipe(catchError(() => of([]))),
        visitors: this.visitorApi.list({ department: departmentId, date }).pipe(catchError(() => of([]))),
        activity: this.activityApi.recent({ limit: '6' }).pipe(catchError(() => of([]))),
        overview: this.attendanceApi.overview({ department: departmentId }).pipe(catchError(() => of([]))),
        breakdown: svc
          ? this.attendanceApi.byCellgroup({ department: departmentId, service: svc._id, date }).pipe(catchError(() => of([])))
          : of([])
      }).subscribe((r) => {
        this.stats = r.stats;
        this.cellgroupCount = r.cellgroups.length;
        this.visitors = r.visitors;
        this.activity = r.activity;
        this.overview = r.overview;
        this.breakdown = r.breakdown;
        this.donut = r.stats ? [
          { name: 'Active', value: r.stats.active, color: '#22c55e' },
          { name: 'Sunday goer only', value: r.stats.sundayGoer ?? 0, color: '#facc15' },
          { name: 'Needs Follow-up', value: r.stats.needsFollowup, color: '#c9922a' },
          { name: 'From other church', value: r.stats.otherChurch ?? 0, color: '#3b82f6' },
          { name: 'Inactive', value: r.stats.inactive, color: '#ff4d6d' }
        ] : [];
        this.loading = false;
      });
    });
  }
}

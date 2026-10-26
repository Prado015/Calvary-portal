import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { StatisticCardComponent } from '../../shared/components/cards/statistic-card.component';
import { ChartCardComponent } from '../../shared/components/charts/chart-card.component';
import { ActivityService } from '../../core/services/activity.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatisticCardComponent, ChartCardComponent],
  template: `
    <app-page-header title="Overview" subtitle="Ushering back-office at a glance"></app-page-header>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <app-statistic-card icon="user-plus" iconBg="bg-purple-500/70" label="Total Ushers" [value]="stats?.totalUshers ?? 0"></app-statistic-card>
      <app-statistic-card icon="user-check" iconBg="bg-brand-green/70" label="Active Ushers" [value]="stats?.activeUshers ?? 0"></app-statistic-card>
      <app-statistic-card icon="users" iconBg="bg-blue-500/70" label="Visitors Today" [value]="stats?.todayVisitors ?? 0"></app-statistic-card>
      <app-statistic-card icon="clipboard-check" iconBg="bg-gold/70" label="Usher Check-ins Today" [value]="stats?.todayCheckIns ?? 0"></app-statistic-card>
    </div>
    <app-chart-card title="Recent Activity">
      <p *ngIf="!activity.length" class="text-brand-muted text-sm">Nothing yet.</p>
      <div *ngFor="let a of activity" class="flex items-center justify-between text-sm border-b border-brand-border last:border-0 py-2">
        <span><span class="font-medium">{{ a.userName }}</span> <span class="text-brand-muted">{{ a.action }}d {{ a.module }}</span></span>
        <span class="text-xs text-brand-muted">{{ a.createdAt | date: 'short' }}</span>
      </div>
    </app-chart-card>
  `
})
export class AdminOverviewComponent implements OnInit {
  private http = inject(HttpClient);
  private activityApi = inject(ActivityService);
  stats: any = null;
  activity: any[] = [];

  ngOnInit(): void {
    this.http.get<{ data: any }>('/api/dashboard/stats').subscribe((r) => (this.stats = r.data));
    this.activityApi.recent({ limit: '10' }).subscribe((a) => (this.activity = a));
  }
}

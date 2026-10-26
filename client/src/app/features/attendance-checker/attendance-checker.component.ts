import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { DepartmentStore } from '../../core/services/department-store.service';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ServiceAttendanceComponent } from './service-attendance.component';
import { IndividualAttendanceComponent } from './individual-attendance.component';

// Roles that may tick attendance boxes (matches the server).
const MARKERS = ['super_admin', 'head_usher', 'usher_secretary', 'usher', 'counter_staff'];

// One screen, two homes: /admin/attendance-checker (every ministry, with a ministry
// filter) and /portal/:slug/attendance (just that ministry — DepartmentStore is provided).
@Component({
  selector: 'app-attendance-checker',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ServiceAttendanceComponent, IndividualAttendanceComponent],
  template: `
    <div class="bg-navy-card border border-brand-border rounded-brand p-5">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 class="text-white font-bold text-lg flex items-center gap-2">
            <app-icon name="clipboard-check" [size]="20" extraClass="text-gold-light"></app-icon> Attendance Checker
          </h1>
          <p class="text-xs text-brand-muted mt-1">Track and manage attendance across services.
            <span *ngIf="scopeName" class="text-gold-light"> · {{ scopeName }}</span></p>
        </div>
        <select *ngIf="!store" [(ngModel)]="departmentId" name="dept"
                class="bg-navy-input border border-brand-border rounded-brand text-sm py-2.5 px-3 text-brand-text">
          <option value="">All ministries</option>
          <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
        </select>
      </div>

      <div class="flex gap-2 border-b border-brand-border mb-5">
        <button (click)="tab = 'individual'" [class]="tabClass('individual')">
          <app-icon name="user" [size]="14"></app-icon> Individual Attendance
        </button>
        <button (click)="tab = 'service'" [class]="tabClass('service')">
          <app-icon name="clipboard-list" [size]="14"></app-icon> Service Attendance
        </button>
      </div>

      <ng-container *ngIf="ready">
        <app-service-attendance *ngIf="tab === 'service'" [departmentId]="effectiveDept" [canMark]="canMark" [canManage]="canManage"></app-service-attendance>
        <app-individual-attendance *ngIf="tab === 'individual'" [departmentId]="effectiveDept" [canMark]="canMark"></app-individual-attendance>
      </ng-container>
      <p *ngIf="!ready" class="text-center py-10 text-brand-muted text-sm">Loading…</p>
    </div>
  `
})
export class AttendanceCheckerComponent implements OnInit {
  store = inject(DepartmentStore, { optional: true });
  private auth = inject(AuthService);
  private permissions = inject(PermissionsService);
  private deptApi = inject(DepartmentService);

  tab: 'service' | 'individual' = 'service';
  departments: DepartmentRecord[] = [];
  departmentId = ''; // admin filter ('' = all ministries)

  canMark = MARKERS.includes(this.auth.user()?.role || '');
  canManage = this.permissions.canManage(this.auth.user());

  // In a portal, wait for the ministry to load; in admin, always ready.
  get ready(): boolean { return !this.store || !!this.store.department(); }
  get effectiveDept(): string { return this.store ? this.store.department()?._id || '' : this.departmentId; }
  get scopeName(): string {
    if (this.store) return this.store.department()?.name || '';
    return this.departments.find((d) => d._id === this.departmentId)?.name || '';
  }

  tabClass(t: string): string {
    return 'flex items-center gap-2 px-4 py-2.5 text-sm -mb-px border-b-2 transition-colors ' +
      (this.tab === t ? 'border-gold text-gold-light font-semibold' : 'border-transparent text-brand-muted hover:text-brand-text');
  }

  ngOnInit(): void {
    if (!this.store) this.deptApi.list().subscribe((d) => (this.departments = d));
  }
}

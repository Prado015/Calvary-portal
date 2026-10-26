import { Component, OnInit, Injector, effect, inject, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { DepartmentStore } from '../../core/services/department-store.service';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { MemberService, MemberRecord } from '../../core/services/member.service';
import { CellgroupService, CellgroupRecord } from '../../core/services/cellgroup.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { MemberFormComponent } from '../../shared/components/modals/member-form.component';
import { ConfirmationModalComponent } from '../../shared/components/modals/confirmation-modal.component';
import { statusLabel } from '../../core/utils/member-status';

// Used inside a portal (/portal/:slug/members, scoped via DepartmentStore) and
// inside admin (/admin/members, no store provided -> unscoped, all departments).
@Component({
  selector: 'app-members-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, IconComponent, ButtonComponent, MemberFormComponent, ConfirmationModalComponent],
  template: `
    <app-page-header title="Members" [subtitle]="department ? department.name + ' member registry' : 'All members, every department'">
      <div actions *ngIf="canManage" class="w-40"><app-button (click)="openForm(null)">Add Member</app-button></div>
    </app-page-header>

    <div class="flex flex-wrap gap-3 mb-4">
      <div class="relative flex-1 min-w-[220px] flex items-center">
        <app-icon name="search" [size]="16" extraClass="absolute left-4 text-brand-muted"></app-icon>
        <input [(ngModel)]="search" (ngModelChange)="onSearch()" placeholder="Search by name or member ID…"
               class="w-full bg-navy-input border border-brand-border rounded-brand text-sm py-3 pl-11 pr-4 text-brand-text outline-none" />
      </div>
      <select [(ngModel)]="cellgroupFilter" (ngModelChange)="page = 1; load()"
              class="bg-navy-input border border-brand-border rounded-brand text-sm px-4 text-brand-text">
        <option value="">All Cellgroups</option>
        <option *ngFor="let cg of cellgroups" [value]="cg._id">{{ cg.name }}</option>
      </select>
    </div>

    <ng-template #rowActions let-m>
      <div class="flex gap-3">
        <button (click)="openForm(m)" class="text-brand-muted hover:text-gold-light"><app-icon name="pencil" [size]="15"></app-icon></button>
        <button *ngIf="canDelete" (click)="deleteTarget = m" class="text-brand-muted hover:text-brand-error"><app-icon name="trash-2" [size]="15"></app-icon></button>
      </div>
    </ng-template>

    <app-data-table [columns]="columns" [rows]="members" [loading]="loading" [actionsTemplate]="rowActions"></app-data-table>

    <div *ngIf="pages > 1" class="flex items-center justify-between mt-4 text-sm text-brand-muted">
      <span>Showing page {{ page }} of {{ pages }} · {{ total }} members</span>
      <div class="flex gap-2">
        <button (click)="go(page - 1)" [disabled]="page <= 1" class="px-3 py-1.5 rounded-lg bg-navy-input disabled:opacity-40">Prev</button>
        <button (click)="go(page + 1)" [disabled]="page >= pages" class="px-3 py-1.5 rounded-lg bg-navy-input disabled:opacity-40">Next</button>
      </div>
    </div>

    <app-member-form [open]="formOpen" [member]="editing" [departments]="departments"
      [fixedDepartmentId]="department && scoped ? department._id : null"
      (saved)="formOpen = false; load()" (closed)="formOpen = false"></app-member-form>

    <app-confirmation-modal [open]="!!deleteTarget" title="Delete member?"
      [message]="'This permanently removes ' + deleteTarget?.firstName + ' ' + deleteTarget?.lastName + ' and cannot be undone.'"
      confirmLabel="Delete" [danger]="true" (confirmed)="remove()" (cancelled)="deleteTarget = null"></app-confirmation-modal>
  `
})
export class MembersListComponent implements OnInit {
  private store = inject(DepartmentStore, { optional: true });
  private injector = inject(Injector);
  private auth = inject(AuthService);
  private permissions = inject(PermissionsService);
  private memberApi = inject(MemberService);
  private cellgroupApi = inject(CellgroupService);
  private deptApi = inject(DepartmentService);

  scoped = !!this.store;
  canManage = this.permissions.canManage(this.auth.user());
  canDelete = this.permissions.isSystemAdmin(this.auth.user()); // server: delete is super_admin/head_usher only
  department: DepartmentRecord | null = null;
  departments: DepartmentRecord[] = [];
  members: MemberRecord[] = [];
  cellgroups: CellgroupRecord[] = [];
  search = '';
  cellgroupFilter = '';
  loading = true;
  page = 1; pages = 1; total = 0;
  formOpen = false;
  editing: MemberRecord | null = null;
  deleteTarget: MemberRecord | null = null;
  private searchTimer: any;

  columns: TableColumn[] = [
    { key: 'memberId', label: 'Member ID' },
    { key: 'name', label: 'Name', render: (m) => `${m.firstName} ${m.lastName}` },
    ...(this.scoped ? [] : [{ key: 'department', label: 'Department', render: (m: any) => m.department?.name || '—' }]),
    { key: 'cellgroup', label: 'Cellgroup', render: (m) => m.cellgroup?.name || '—' },
    { key: 'contact', label: 'Contact', render: (m) => m.contact || '—' },
    { key: 'status', label: 'Status', badge: (m) => ({ status: m.status, label: statusLabel(m.status) }) },
    { key: 'dateJoined', label: 'Date Joined', render: (m) => new Date(m.dateJoined).toLocaleDateString() },
    ...(this.canManage ? [{ key: 'actions', label: '', actions: true }] : [])
  ];

  ngOnInit(): void {
    if (!this.store) {
      this.deptApi.list().subscribe((d) => (this.departments = d));
      this.loadCellgroups();
      this.load();
      return;
    }
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const dept = this.store!.department();
        if (dept) { this.department = dept; this.loadCellgroups(); this.load(); }
      }, { allowSignalWrites: true });
    });
  }

  private loadCellgroups(): void {
    const params: Record<string, string> = this.department ? { department: this.department._id } : {};
    this.cellgroupApi.list(params).subscribe((l) => (this.cellgroups = l));
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 300);
  }

  go(p: number): void { this.page = Math.min(Math.max(p, 1), this.pages); this.load(); }

  load(): void {
    this.loading = true;
    const params: Record<string, string> = { page: String(this.page), limit: '15' };
    if (this.department) params['department'] = this.department._id;
    if (this.cellgroupFilter) params['cellgroup'] = this.cellgroupFilter;
    if (this.search) params['search'] = this.search;
    this.memberApi.list(params).subscribe({
      next: (res) => { this.members = res.data; this.pages = res.pages || 1; this.total = res.total; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openForm(m: MemberRecord | null): void { this.editing = m; this.formOpen = true; }

  remove(): void {
    if (!this.deleteTarget) return;
    this.memberApi.remove(this.deleteTarget._id).subscribe(() => { this.deleteTarget = null; this.load(); });
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'head_usher', label: 'Head Usher' },
  { value: 'usher_secretary', label: 'Secretary / Portal Manager' },
  { value: 'usher', label: 'Usher' },
  { value: 'counter_staff', label: 'Counter Staff' },
  { value: 'viewer', label: 'Viewer' }
];
const blank = () => ({ firstName: '', lastName: '', email: '', password: '', role: 'usher_secretary', department: '' });

// Super admin: create logins and choose which ministry portal each one lands in.
@Component({         
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, ButtonComponent],
  template: `
    <app-page-header title="User Accounts" subtitle="Who can sign in, and to which portal">
      <div actions class="w-40"><app-button (click)="formOpen = true">Add User</app-button></div>
    </app-page-header>

    <ng-template #rowActions let-u>
      <button (click)="toggle(u)" class="text-xs px-3 py-1.5 rounded-lg bg-navy-input text-brand-muted hover:text-gold-light">
        {{ u.status === 'active' ? 'Deactivate' : 'Activate' }}
      </button>
    </ng-template>
    <app-data-table [columns]="columns" [rows]="users" [loading]="loading" [actionsTemplate]="rowActions"></app-data-table>

    <div *ngIf="formOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 class="text-white font-bold mb-4">Add User</h3>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <input [(ngModel)]="form.firstName" name="firstName" placeholder="First name" required class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <input [(ngModel)]="form.lastName" name="lastName" placeholder="Last name" required class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        </div>
        <input [(ngModel)]="form.email" name="email" type="email" placeholder="Email (used to log in)" required class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <input [(ngModel)]="form.password" name="password" type="password" placeholder="Temporary password (min 8 chars)" required minlength="8" class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <select [(ngModel)]="form.role" name="role" class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text">
          <option *ngFor="let r of roles" [value]="r.value">{{ r.label }}</option>
        </select>
        <select [(ngModel)]="form.department" name="department" class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text">
          <option value="">No ministry (admin back office)</option>
          <option *ngFor="let d of departments" [value]="d._id">{{ d.name }} portal</option>
        </select>
        <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="formOpen = false">Cancel</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Create User' }}</app-button>
        </div>
      </form>
    </div>
  `
})
export class UsersListComponent implements OnInit {
  private api = inject(UserService);
  private deptApi = inject(DepartmentService);

  roles = ROLES;
  users: any[] = [];
  departments: DepartmentRecord[] = [];
  loading = true;
  formOpen = false;
  saving = false;
  error = '';
  form = blank();

  columns: TableColumn[] = [
    { key: 'name', label: 'Name', render: (u) => `${u.firstName} ${u.lastName}` },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (u) => ROLES.find((r) => r.value === u.role)?.label || u.role },
    { key: 'department', label: 'Portal', render: (u) => u.department?.name || 'Admin back office' },
    { key: 'status', label: 'Status', badge: (u) => ({ status: u.status }) },
    { key: 'actions', label: '', actions: true }
  ];

  ngOnInit(): void {
    this.deptApi.list().subscribe((d) => (this.departments = d));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list().subscribe({ next: (u) => { this.users = u; this.loading = false; }, error: () => (this.loading = false) });
  }

  save(): void {
    this.saving = true; this.error = '';
    this.api.create({ ...this.form, department: this.form.department || null }).subscribe({
      next: () => { this.saving = false; this.formOpen = false; this.form = blank(); this.load(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not create user'; }
    });
  }

  toggle(u: any): void {
    this.api.update(u._id, { status: u.status === 'active' ? 'inactive' : 'active' }).subscribe({
      next: () => this.load(),
      error: (e) => alert(e.error?.message || 'Update failed')
    });
  }
}

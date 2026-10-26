import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CellgroupService, CellgroupRecord } from '../../core/services/cellgroup.service';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ConfirmationModalComponent } from '../../shared/components/modals/confirmation-modal.component';

// Admin view of every cellgroup in every ministry: add, rename, move, switch off, delete.
@Component({
  selector: 'app-cellgroups-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, DataTableComponent, ButtonComponent, IconComponent, ConfirmationModalComponent],
  template: `
    <app-page-header title="Cellgroups" subtitle="All cellgroups across every ministry">
      <div actions class="flex items-center gap-2">
        <select [(ngModel)]="filterDept" (ngModelChange)="load()" name="filter"
                class="bg-navy-input border border-brand-border rounded-brand text-sm py-2.5 px-3 text-brand-text">
          <option value="">All ministries</option>
          <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
        </select>
        <div class="w-40"><app-button (click)="openForm(null)">Add Cellgroup</app-button></div>
      </div>
    </app-page-header>

    <p *ngIf="message" class="text-brand-error text-sm mb-3">{{ message }}</p>
    <p class="text-[11px] text-brand-muted mb-3">A cellgroup with members or report history can't be deleted — switch it off instead. Members can be moved from the Members page.</p>

    <ng-template #rowActions let-c>
      <div class="flex items-center gap-3 whitespace-nowrap">
        <a [routerLink]="['/portal', c.department?.slug, 'cellgroups', c._id]" class="text-xs text-gold-light hover:underline">Report</a>
        <button (click)="openForm(c)" class="text-brand-muted hover:text-gold-light" title="Edit"><app-icon name="pencil" [size]="15"></app-icon></button>
        <button (click)="toggle(c)" class="text-xs text-brand-muted hover:text-gold-light">{{ c.active === false ? 'Switch on' : 'Switch off' }}</button>
        <button *ngIf="isSuperAdmin" (click)="delTarget = c" class="text-brand-muted hover:text-brand-error" title="Delete"><app-icon name="trash-2" [size]="15"></app-icon></button>
      </div>
    </ng-template>
    <app-data-table [columns]="columns" [rows]="rows" [loading]="loading" [actionsTemplate]="rowActions" emptyLabel="No cellgroups found"></app-data-table>

    <div *ngIf="formOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 class="text-white font-bold mb-4">{{ editing ? 'Edit cellgroup' : 'Add cellgroup' }}</h3>
        <label class="lbl">Name</label>
        <input [(ngModel)]="form.name" name="name" required minlength="2" maxlength="80" class="inp mb-3" placeholder="e.g. Faith Builders (Cell 1)" />
        <label class="lbl">Ministry</label>
        <select [(ngModel)]="form.department" name="department" required [disabled]="!!editing && (editing.memberCount || 0) > 0" class="inp mb-1">
          <option value="">Choose ministry</option>
          <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
        </select>
        <p *ngIf="editing && (editing.memberCount || 0) > 0" class="text-[11px] text-gold-light mb-3">{{ editing.memberCount }} member(s) are in this cellgroup — move them before changing its ministry.</p>
        <p *ngIf="!(editing && (editing.memberCount || 0) > 0)" class="mb-3"></p>
        <label class="lbl">Leader</label>
        <input [(ngModel)]="form.leaderName" name="leaderName" class="inp mb-3" />
        <label class="lbl">Assistant leaders (one per line)</label>
        <textarea [(ngModel)]="form.assistants" name="assistants" rows="2" class="inp mb-3"></textarea>
        <label *ngIf="editing" class="flex items-center gap-2 text-sm text-brand-muted mb-4 cursor-pointer">
          <input type="checkbox" [(ngModel)]="form.active" name="active" class="accent-gold" /> Active
        </label>
        <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="formOpen = false">Cancel</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</app-button>
        </div>
      </form>
    </div>

    <app-confirmation-modal [open]="!!delTarget" title="Delete this cellgroup?"
      [message]="'“' + (delTarget?.name || '') + '” will be removed permanently. This only works if it has no members or report history.'"
      confirmLabel="Delete" [danger]="true" (confirmed)="remove()" (cancelled)="delTarget = null"></app-confirmation-modal>
  `,
  styles: [`
    .lbl { display:block; font-size:11px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:#e8b84b; margin-bottom:6px; }
    .inp { width:100%; background:#0d1a2e; border:1px solid rgba(255,255,255,0.08); border-radius:14px; font-size:14px; padding:12px 16px; color:#e0e8f5; outline:none; }
    .inp:disabled { opacity:.5; }
  `]
})
export class CellgroupsAdminComponent implements OnInit {
  private api = inject(CellgroupService);
  private deptApi = inject(DepartmentService);
  private auth = inject(AuthService);

  isSuperAdmin = this.auth.user()?.role === 'super_admin'; // server: only super admin may delete
  departments: DepartmentRecord[] = [];
  rows: CellgroupRecord[] = [];
  filterDept = '';
  loading = true; message = '';
  formOpen = false; editing: CellgroupRecord | null = null; saving = false; error = '';
  form = { name: '', department: '', leaderName: '', assistants: '', active: true };
  delTarget: CellgroupRecord | null = null;

  columns: TableColumn[] = [
    { key: 'name', label: 'Cellgroup' },
    { key: 'department', label: 'Ministry', render: (c) => c.department?.name || '—' },
    { key: 'leaderName', label: 'Leader', render: (c) => c.leaderName || '—' },
    { key: 'memberCount', label: 'Members', render: (c) => String(c.memberCount ?? 0) },
    { key: 'active', label: 'Status', badge: (c) => ({ status: c.active === false ? 'inactive' : 'active', label: c.active === false ? 'Off' : 'Active' }) },
    { key: 'actions', label: '', actions: true }
  ];

  ngOnInit(): void {
    this.deptApi.list().subscribe((d) => (this.departments = d));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.listAll(this.filterDept).subscribe({ next: (r) => { this.rows = r; this.loading = false; }, error: () => (this.loading = false) });
  }

  openForm(c: CellgroupRecord | null): void {
    this.editing = c; this.error = ''; this.message = '';
    this.form = c
      ? { name: c.name, department: c.department?._id || '', leaderName: c.leaderName || '', assistants: (c.assistantLeaders || []).join('\n'), active: c.active !== false }
      : { name: '', department: this.filterDept, leaderName: '', assistants: '', active: true };
    this.formOpen = true;
  }

  save(): void {
    this.saving = true; this.error = '';
    const assistantLeaders = this.form.assistants.split('\n').map((s) => s.trim()).filter(Boolean);
    const base = { name: this.form.name.trim(), department: this.form.department, leaderName: this.form.leaderName.trim(), assistantLeaders };
    const req = this.editing ? this.api.update(this.editing._id, { ...base, active: this.form.active }) : this.api.create(base);
    req.subscribe({
      next: () => { this.saving = false; this.formOpen = false; this.load(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not save the cellgroup.'; }
    });
  }

  toggle(c: CellgroupRecord): void {
    this.message = '';
    this.api.update(c._id, { active: c.active === false }).subscribe({
      next: () => this.load(), error: (e) => (this.message = e.error?.message || 'Could not update.')
    });
  }

  remove(): void {
    const c = this.delTarget; if (!c) return;
    this.delTarget = null; this.message = '';
    this.api.remove(c._id).subscribe({ next: () => this.load(), error: (e) => (this.message = e.error?.message || 'Could not delete.') });
  }
}

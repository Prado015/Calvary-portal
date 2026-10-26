import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ConfirmationModalComponent } from '../../shared/components/modals/confirmation-modal.component';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

// Super admin: add, rename, switch off or delete ministries.
@Component({
  selector: 'app-departments-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, DataTableComponent, ButtonComponent, IconComponent, ConfirmationModalComponent],
  template: `
    <app-page-header title="Departments" subtitle="Every ministry in the church — each one gets its own portal">
      <div actions class="w-44"><app-button (click)="openForm(null)">Add Department</app-button></div>
    </app-page-header>

    <p *ngIf="message" class="text-brand-error text-sm mb-3">{{ message }}</p>
    <p class="text-[11px] text-brand-muted mb-3">A department with members, cellgroups or user accounts can't be deleted — switch it off instead and it disappears from login and attendance.</p>

    <ng-template #rowActions let-d>
      <div class="flex items-center gap-3 whitespace-nowrap">
        <a [routerLink]="['/portal', d.slug]" class="text-xs text-gold-light hover:underline">Open portal</a>
        <button (click)="openForm(d)" class="text-brand-muted hover:text-gold-light" title="Edit"><app-icon name="pencil" [size]="15"></app-icon></button>
        <button (click)="toggle(d)" class="text-xs text-brand-muted hover:text-gold-light">{{ d.active ? 'Switch off' : 'Switch on' }}</button>
        <button (click)="delTarget = d" class="text-brand-muted hover:text-brand-error" title="Delete"><app-icon name="trash-2" [size]="15"></app-icon></button>
      </div>
    </ng-template>
    <app-data-table [columns]="columns" [rows]="rows" [loading]="loading" [actionsTemplate]="rowActions" emptyLabel="No departments yet"></app-data-table>

    <div *ngIf="formOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm">
        <h3 class="text-white font-bold mb-4">{{ editing ? 'Edit department' : 'Add department' }}</h3>
        <label class="lbl">Name</label>
        <input [(ngModel)]="form.name" (ngModelChange)="onName()" name="name" required minlength="2" maxlength="60" class="inp mb-3" placeholder="e.g. Music Ministry" />
        <label class="lbl">Portal address</label>
        <div class="flex items-center mb-1">
          <span class="text-xs text-brand-muted mr-2">/portal/</span>
          <input [(ngModel)]="form.slug" (ngModelChange)="slugTouched = true" name="slug" required class="inp" placeholder="music" />
        </div>
        <p *ngIf="editing" class="text-[11px] text-gold-light mb-3">Changing this changes the portal web address. Logins keep working.</p>
        <p *ngIf="!editing" class="mb-3"></p>
        <label class="lbl">Description (optional)</label>
        <input [(ngModel)]="form.description" name="description" maxlength="300" class="inp mb-3" />
        <label class="flex items-center gap-2 text-sm text-brand-muted mb-4 cursor-pointer">
          <input type="checkbox" [(ngModel)]="form.active" name="active" class="accent-gold" /> Active (shown at login and in attendance)
        </label>
        <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="formOpen = false">Cancel</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</app-button>
        </div>
      </form>
    </div>

    <app-confirmation-modal [open]="!!delTarget" title="Delete this department?"
      [message]="'“' + (delTarget?.name || '') + '” will be removed permanently. This only works if it has no members, cellgroups or user accounts.'"
      confirmLabel="Delete" [danger]="true" (confirmed)="remove()" (cancelled)="delTarget = null"></app-confirmation-modal>
  `,
  styles: [`
    .lbl { display:block; font-size:11px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:#e8b84b; margin-bottom:6px; }
    .inp { width:100%; background:#0d1a2e; border:1px solid rgba(255,255,255,0.08); border-radius:14px; font-size:14px; padding:12px 16px; color:#e0e8f5; outline:none; }
  `]
})
export class DepartmentsAdminComponent implements OnInit {
  private api = inject(DepartmentService);

  rows: DepartmentRecord[] = [];
  loading = true; message = '';
  formOpen = false; editing: DepartmentRecord | null = null; saving = false; error = '';
  form = { name: '', slug: '', description: '', active: true };
  slugTouched = false;
  delTarget: DepartmentRecord | null = null;

  columns: TableColumn[] = [
    { key: 'name', label: 'Department' },
    { key: 'slug', label: 'Portal', render: (d) => `/portal/${d.slug}` },
    { key: 'memberCount', label: 'Members', render: (d) => String(d.memberCount ?? 0) },
    { key: 'cellgroupCount', label: 'Cellgroups', render: (d) => String(d.cellgroupCount ?? 0) },
    { key: 'userCount', label: 'Logins', render: (d) => String(d.userCount ?? 0) },
    { key: 'active', label: 'Status', badge: (d) => ({ status: d.active === false ? 'inactive' : 'active', label: d.active === false ? 'Off' : 'Active' }) },
    { key: 'actions', label: '', actions: true }
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.listWithCounts().subscribe({ next: (r) => { this.rows = r; this.loading = false; }, error: () => (this.loading = false) });
  }

  openForm(d: DepartmentRecord | null): void {
    this.editing = d; this.error = ''; this.message = '';
    this.slugTouched = !!d;
    this.form = d ? { name: d.name, slug: d.slug, description: d.description || '', active: d.active !== false }
                  : { name: '', slug: '', description: '', active: true };
    this.formOpen = true;
  }
  onName(): void { if (!this.slugTouched) this.form.slug = slugify(this.form.name); }

  save(): void {
    this.saving = true; this.error = '';
    const payload = { ...this.form, name: this.form.name.trim(), slug: this.form.slug.trim() };
    const req = this.editing ? this.api.update(this.editing._id, payload) : this.api.create(payload);
    req.subscribe({
      next: () => { this.saving = false; this.formOpen = false; this.load(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not save the department.'; }
    });
  }

  toggle(d: DepartmentRecord): void {
    this.message = '';
    this.api.update(d._id, { active: d.active === false }).subscribe({
      next: () => this.load(), error: (e) => (this.message = e.error?.message || 'Could not update.')
    });
  }

  remove(): void {
    const d = this.delTarget; if (!d) return;
    this.delTarget = null; this.message = '';
    this.api.remove(d._id).subscribe({
      next: () => this.load(), error: (e) => (this.message = e.error?.message || 'Could not delete.')
    });
  }
}

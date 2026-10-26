import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceTypeService, ServiceTypeRecord } from '../../core/services/service-type.service';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ConfirmationModalComponent } from '../../shared/components/modals/confirmation-modal.component';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COLORS = ['gold', 'teal', 'blue', 'purple', 'green', 'red'];

// The service schedule: which gatherings exist and which ministries they apply to.
// Weekly services show up automatically; "custom dates" ones (Prayer Meeting) have
// their dates set by each ministry on its Attendance page.
@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, ButtonComponent, IconComponent, ConfirmationModalComponent],
  template: `
    <app-page-header title="Service Schedule" subtitle="The services members are marked against">
      <div actions class="w-44"><app-button (click)="openForm(null)">Add Service</app-button></div>
    </app-page-header>

    <div class="bg-navy-card border border-brand-border rounded-brand p-4 mb-4 text-xs text-brand-muted leading-relaxed">
      <p><b class="text-brand-text">Weekly</b> services (Sunday, Wednesday, Youth Friday…) appear in the Attendance Checker automatically on their weekday.</p>
      <p class="mt-1"><b class="text-brand-text">Custom dates</b> services (Prayer Meeting) have no fixed weekday — each ministry sets its own dates from its Attendance page, then checks its members.</p>
      <p class="mt-1">"Applies to" limits a service to certain ministries; leave it empty for everyone.</p>
    </div>

    <p *ngIf="message" class="text-brand-error text-sm mb-3">{{ message }}</p>

    <ng-template #rowActions let-t>
      <div class="flex items-center gap-3 whitespace-nowrap">
        <button (click)="openForm(t)" class="text-brand-muted hover:text-gold-light" title="Edit"><app-icon name="pencil" [size]="15"></app-icon></button>
        <button (click)="toggle(t)" class="text-xs text-brand-muted hover:text-gold-light">{{ t.active ? 'Switch off' : 'Switch on' }}</button>
        <button *ngIf="!t.code" (click)="delTarget = t" class="text-brand-muted hover:text-brand-error" title="Delete"><app-icon name="trash-2" [size]="15"></app-icon></button>
      </div>
    </ng-template>
    <app-data-table [columns]="columns" [rows]="rows" [loading]="loading" [actionsTemplate]="rowActions" emptyLabel="No services yet"></app-data-table>

    <div *ngIf="formOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 class="text-white font-bold mb-4">{{ editing ? 'Edit service' : 'Add service' }}</h3>
        <label class="lbl">Name</label>
        <input [(ngModel)]="form.name" name="name" required minlength="2" maxlength="60" class="inp mb-3" placeholder="e.g. Saturday Prayer" />

        <label class="lbl">How are its dates set?</label>
        <select [(ngModel)]="form.kind" name="kind" class="inp mb-3">
          <option value="weekly">Every week on a fixed day</option>
          <option value="custom">Custom dates, set by each ministry</option>
        </select>

        <ng-container *ngIf="form.kind === 'weekly'">
          <label class="lbl">Day of the week</label>
          <select [(ngModel)]="form.weekday" name="weekday" class="inp mb-3">
            <option *ngFor="let d of days; let i = index" [ngValue]="i">{{ d }}</option>
          </select>
        </ng-container>

        <label class="lbl">Applies to</label>
        <div class="bg-navy-input border border-brand-border rounded-brand p-3 mb-1 max-h-40 overflow-y-auto space-y-1.5">
          <label *ngFor="let d of departments" class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" class="accent-gold" [checked]="form.departments.includes(d._id)" (change)="toggleDept(d._id)" /> {{ d.name }}
          </label>
        </div>
        <p class="text-[11px] text-brand-muted mb-3">{{ form.departments.length ? form.departments.length + ' selected' : 'None selected = every ministry' }}</p>

        <label class="lbl">Colour</label>
        <div class="flex gap-2 mb-3">
          <button type="button" *ngFor="let c of colors" (click)="form.color = c" [class]="swatch(c) + ' w-7 h-7 rounded-full border-2 ' + (form.color === c ? 'border-white' : 'border-transparent')" [title]="c"></button>
        </div>

        <label class="flex items-center gap-2 text-sm text-brand-muted mb-4 cursor-pointer">
          <input type="checkbox" [(ngModel)]="form.active" name="active" class="accent-gold" /> Active
        </label>
        <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="formOpen = false">Cancel</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</app-button>
        </div>
      </form>
    </div>

    <app-confirmation-modal [open]="!!delTarget" title="Delete this service?"
      [message]="'“' + (delTarget?.name || '') + '” will be removed. Services that already have recorded dates cannot be deleted — switch them off instead.'"
      confirmLabel="Delete" [danger]="true" (confirmed)="remove()" (cancelled)="delTarget = null"></app-confirmation-modal>
  `,
  styles: [`
    .lbl { display:block; font-size:11px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:#e8b84b; margin-bottom:6px; }
    .inp { width:100%; background:#0d1a2e; border:1px solid rgba(255,255,255,0.08); border-radius:14px; font-size:14px; padding:12px 16px; color:#e0e8f5; outline:none; }
  `]
})
export class ServicesListComponent implements OnInit {
  private api = inject(ServiceTypeService);
  private deptApi = inject(DepartmentService);

  days = DAYS; colors = COLORS;
  rows: ServiceTypeRecord[] = [];
  departments: DepartmentRecord[] = [];
  loading = true; message = '';
  formOpen = false; editing: ServiceTypeRecord | null = null; saving = false; error = '';
  form: { name: string; kind: 'weekly' | 'custom'; weekday: number; departments: string[]; color: string; active: boolean } =
    { name: '', kind: 'weekly', weekday: 0, departments: [], color: 'gold', active: true };
  delTarget: ServiceTypeRecord | null = null;

  columns: TableColumn[] = [
    { key: 'name', label: 'Service', render: (t) => t.name },
    { key: 'when', label: 'When', render: (t) => (t.kind === 'weekly' ? `Every ${DAYS[t.weekday ?? 0]}` : 'Dates set by the ministry') },
    { key: 'departments', label: 'Applies to', render: (t) => (t.departments.length ? t.departments.map((d: { name: string }) => d.name).join(', ') : 'All ministries') },
    { key: 'color', label: 'Colour', render: (t) => t.color },
    { key: 'active', label: 'Status', badge: (t) => ({ status: t.active ? 'active' : 'inactive', label: t.active ? 'Active' : 'Off' }) },
    { key: 'actions', label: '', actions: true }
  ];

  swatch(c: string): string {
    return ({ gold: 'bg-yellow-400', teal: 'bg-teal-400', blue: 'bg-blue-400', purple: 'bg-purple-400', green: 'bg-green-400', red: 'bg-red-400' } as Record<string, string>)[c] || 'bg-yellow-400';
  }

  ngOnInit(): void {
    this.deptApi.list().subscribe((d) => (this.departments = d));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list(true).subscribe({ next: (r) => { this.rows = r; this.loading = false; }, error: () => (this.loading = false) });
  }

  openForm(t: ServiceTypeRecord | null): void {
    this.editing = t; this.error = ''; this.message = '';
    this.form = t
      ? { name: t.name, kind: t.kind, weekday: t.weekday ?? 0, departments: t.departments.map((d) => d._id), color: t.color, active: t.active }
      : { name: '', kind: 'weekly', weekday: 0, departments: [], color: 'gold', active: true };
    this.formOpen = true;
  }

  toggleDept(id: string): void {
    this.form.departments = this.form.departments.includes(id) ? this.form.departments.filter((x) => x !== id) : [...this.form.departments, id];
  }

  save(): void {
    this.saving = true; this.error = '';
    const payload = {
      name: this.form.name.trim(), kind: this.form.kind, weekday: this.form.kind === 'weekly' ? Number(this.form.weekday) : null,
      departments: this.form.departments, color: this.form.color, active: this.form.active
    };
    const req = this.editing ? this.api.update(this.editing._id, payload) : this.api.create(payload);
    req.subscribe({
      next: () => { this.saving = false; this.formOpen = false; this.load(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not save the service.'; }
    });
  }

  toggle(t: ServiceTypeRecord): void {
    this.message = '';
    this.api.update(t._id, { active: !t.active }).subscribe({ next: () => this.load(), error: (e) => (this.message = e.error?.message || 'Could not update.') });
  }

  remove(): void {
    const t = this.delTarget; if (!t) return;
    this.delTarget = null; this.message = '';
    this.api.remove(t._id).subscribe({ next: () => this.load(), error: (e) => (this.message = e.error?.message || 'Could not delete.') });
  }
}

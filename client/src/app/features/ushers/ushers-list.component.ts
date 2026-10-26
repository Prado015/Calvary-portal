import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsherService } from '../../core/services/usher.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { ConfirmationModalComponent } from '../../shared/components/modals/confirmation-modal.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

const EMPTY = { firstName: '', lastName: '', phone: '', department: '', type: 'Usher', status: 'Active' };

@Component({
  selector: 'app-ushers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, ButtonComponent, ConfirmationModalComponent, IconComponent],
  template: `
    <app-page-header title="Ushers" subtitle="Ushering staff roster">
      <div actions class="w-40"><app-button (click)="openForm(null)">Add Usher</app-button></div>
    </app-page-header>

    <div class="relative flex items-center max-w-sm mb-4">
      <app-icon name="search" [size]="16" extraClass="absolute left-4 text-brand-muted"></app-icon>
      <input [(ngModel)]="search" (ngModelChange)="load()" placeholder="Search by name, code, or phone…"
             class="w-full bg-navy-input border border-brand-border rounded-brand text-sm py-3 pl-11 pr-4 text-brand-text outline-none" />
    </div>

    <ng-template #rowActions let-u>
      <div class="flex gap-3">
        <button (click)="openForm(u); $event.stopPropagation()" class="text-brand-muted hover:text-gold-light"><app-icon name="pencil" [size]="15"></app-icon></button>
        <button (click)="deleteTarget = u; $event.stopPropagation()" class="text-brand-muted hover:text-brand-error"><app-icon name="trash-2" [size]="15"></app-icon></button>
      </div>
    </ng-template>

    <app-data-table [columns]="columns" [rows]="ushers" [loading]="loading" [actionsTemplate]="rowActions" emptyLabel="No ushers found"></app-data-table>

    <div *ngIf="formOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 class="text-white font-bold mb-4">{{ editing ? 'Edit Usher' : 'Add Usher' }}</h3>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <input [(ngModel)]="form.firstName" name="firstName" placeholder="First name" required class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <input [(ngModel)]="form.lastName" name="lastName" placeholder="Last name" required class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        </div>
        <input [(ngModel)]="form.phone" name="phone" placeholder="Phone" class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <input [(ngModel)]="form.department" name="department" placeholder="Ministry / Department" class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <div class="grid grid-cols-2 gap-3 mb-4">
          <select [(ngModel)]="form.type" name="type" class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-3 text-brand-text">
            <option>Usher</option><option>Usherette</option><option>Head Usher</option>
          </select>
          <select [(ngModel)]="form.status" name="status" class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-3 text-brand-text">
            <option>Active</option><option>Inactive</option><option>Under Observation</option>
          </select>
        </div>
        <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="formOpen = false">Cancel</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</app-button>
        </div>
      </form>
    </div>

    <app-confirmation-modal [open]="!!deleteTarget" title="Remove usher?"
      [message]="'This will permanently remove ' + deleteTarget?.name + ' from the roster.'"
      confirmLabel="Remove" [danger]="true" (confirmed)="remove()" (cancelled)="deleteTarget = null"></app-confirmation-modal>
  `
})
export class UshersListComponent implements OnInit {
  private api = inject(UsherService);

  ushers: any[] = [];
  search = '';
  loading = true;
  formOpen = false;
  editing: any = null;
  form = { ...EMPTY };
  saving = false;
  error = '';
  deleteTarget: any = null;

  columns: TableColumn[] = [
    { key: 'usherCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department', render: (u) => u.department || '—' },
    { key: 'type', label: 'Type' },
    { key: 'phone', label: 'Phone', render: (u) => u.phone || '—' },
    { key: 'status', label: 'Status', badge: (u) => ({ status: u.status === 'Active' ? 'active' : u.status === 'Inactive' ? 'inactive' : 'late', label: u.status }) },
    { key: 'actions', label: '', actions: true }
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const params: Record<string, string> = {};
    if (this.search) params['search'] = this.search;
    this.api.list(params).subscribe({ next: (u) => { this.ushers = u; this.loading = false; }, error: () => (this.loading = false) });
  }

  openForm(usher: any): void {
    this.editing = usher;
    this.form = usher
      ? { firstName: usher.firstName, lastName: usher.lastName, phone: usher.phone || '', department: usher.department || '', type: usher.type, status: usher.status }
      : { ...EMPTY };
    this.error = '';
    this.formOpen = true;
  }

  save(): void {
    this.saving = true;
    this.error = '';
    const req = this.editing ? this.api.update(this.editing._id, this.form) : this.api.create(this.form);
    req.subscribe({
      next: () => { this.saving = false; this.formOpen = false; this.load(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Something went wrong'; }
    });
  }

  remove(): void {
    if (!this.deleteTarget) return;
    this.api.remove(this.deleteTarget._id).subscribe(() => { this.deleteTarget = null; this.load(); });
  }
}

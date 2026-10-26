import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaptismService } from '../../core/services/baptism.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

const blank = () => ({ firstName: '', lastName: '', baptismDate: new Date().toISOString().split('T')[0], age: '', address: '', contactNumber: '', officiatingMinister: '', remarks: '' });

@Component({
  selector: 'app-baptism-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, ButtonComponent, IconComponent],
  template: `
    <app-page-header title="Water Baptism Records" [subtitle]="records.length + ' record' + (records.length === 1 ? '' : 's')">
      <div actions class="w-40"><app-button (click)="formOpen = true">New Record</app-button></div>
    </app-page-header>

    <div class="relative flex items-center max-w-sm mb-4">
      <app-icon name="search" [size]="16" extraClass="absolute left-4 text-brand-muted"></app-icon>
      <input [(ngModel)]="search" (ngModelChange)="load()" placeholder="Search by name…"
             class="w-full bg-navy-input border border-brand-border rounded-brand text-sm py-3 pl-11 pr-4 text-brand-text outline-none" />
    </div>

    <app-data-table [columns]="columns" [rows]="records" [loading]="loading" emptyLabel="No baptism records yet"></app-data-table>

    <div *ngIf="formOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 class="text-white font-bold mb-4">New Baptism Record</h3>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <input [(ngModel)]="form.firstName" name="firstName" placeholder="First name" required class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <input [(ngModel)]="form.lastName" name="lastName" placeholder="Last name" required class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <input type="date" [(ngModel)]="form.baptismDate" name="baptismDate" required class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <input type="number" [(ngModel)]="form.age" name="age" placeholder="Age" class="bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        </div>
        <input [(ngModel)]="form.address" name="address" placeholder="Address" class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <input [(ngModel)]="form.contactNumber" name="contactNumber" placeholder="Contact number" class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <input [(ngModel)]="form.officiatingMinister" name="officiatingMinister" placeholder="Officiating minister" class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <input [(ngModel)]="form.remarks" name="remarks" placeholder="Remarks" class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="formOpen = false">Cancel</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Save Record' }}</app-button>
        </div>
      </form>
    </div>
  `
})
export class BaptismListComponent implements OnInit {
  private api = inject(BaptismService);

  records: any[] = [];
  search = '';
  loading = true;
  formOpen = false;
  saving = false;
  form = blank();

  columns: TableColumn[] = [
    { key: 'name', label: 'Name', render: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'baptismDate', label: 'Date' },
    { key: 'age', label: 'Age', render: (r) => (r.age ?? '—') + '' },
    { key: 'officiatingMinister', label: 'Officiating Minister', render: (r) => r.officiatingMinister || '—' },
    { key: 'contactNumber', label: 'Contact', render: (r) => r.contactNumber || '—' }
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const params: Record<string, string> = {};
    if (this.search) params['search'] = this.search;
    this.api.list(params).subscribe({ next: (r) => { this.records = r; this.loading = false; }, error: () => (this.loading = false) });
  }

  save(): void {
    this.saving = true;
    const payload: any = { ...this.form, age: this.form.age ? parseInt(this.form.age, 10) : null };
    this.api.create(payload).subscribe({
      next: () => { this.saving = false; this.formOpen = false; this.form = blank(); this.load(); },
      error: () => (this.saving = false)
    });
  }
}

import { Component, OnInit, Injector, effect, inject, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentStore } from '../../core/services/department-store.service';
import { VisitorService } from '../../core/services/visitor.service';
import { CellgroupService, CellgroupRecord } from '../../core/services/cellgroup.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';

@Component({
  selector: 'app-visitors-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, ButtonComponent],
  template: `
    <app-page-header title="Visitors" [subtitle]="store.department() ? store.department()!.name + ' visitor registry' : ''">
      <div actions class="w-44"><app-button (click)="modalOpen = true">Register Visitor</app-button></div>
    </app-page-header>

    <app-data-table [columns]="columns" [rows]="visitors" [loading]="loading" emptyLabel="No visitors registered yet"></app-data-table>

    <div *ngIf="modalOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm">
        <h3 class="text-white font-bold mb-4">Register Visitor</h3>
        <label class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">Full Name</label>
        <input [(ngModel)]="form.name" name="name" required class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <label class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">Contact Number</label>
        <input [(ngModel)]="form.contact" name="contact" class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <label class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">Assign to Cellgroup</label>
        <select [(ngModel)]="form.cellgroup" name="cellgroup" class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text">
          <option value="">Unassigned</option>
          <option *ngFor="let cg of cellgroups" [value]="cg._id">{{ cg.name }}</option>
        </select>
        <label class="block text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-light mb-2">Prayer Request (optional)</label>
        <input [(ngModel)]="form.prayerRequest" name="prayerRequest" class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="modalOpen = false">Cancel</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Register' }}</app-button>
        </div>
      </form>
    </div>
  `
})
export class VisitorsListComponent implements OnInit {
  store = inject(DepartmentStore);
  private injector = inject(Injector);
  private visitorApi = inject(VisitorService);
  private cellgroupApi = inject(CellgroupService);

  visitors: any[] = [];
  cellgroups: CellgroupRecord[] = [];
  loading = true;
  modalOpen = false;
  saving = false;
  form = { name: '', contact: '', cellgroup: '', prayerRequest: '' };

  columns: TableColumn[] = [
    { key: 'visitorNumber', label: 'Visitor #' },
    { key: 'name', label: 'Name' },
    { key: 'cellgroup', label: 'Assigned Cellgroup', render: (v) => v.cellgroup?.name || 'Unassigned' },
    { key: 'contact', label: 'Contact', render: (v) => v.contact || '—' },
    { key: 'date', label: 'Date' }
  ];

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const dept = this.store.department();
        if (!dept) return;
        this.load();
        this.cellgroupApi.list({ department: dept._id }).subscribe((l) => (this.cellgroups = l));
      }, { allowSignalWrites: true });
    });
  }

  load(): void {
    const dept = this.store.department();
    if (!dept) return;
    this.loading = true;
    this.visitorApi.list({ department: dept._id }).subscribe({
      next: (v) => { this.visitors = v; this.loading = false; },
      error: () => (this.loading = false)
    });
  }

  save(): void {
    const dept = this.store.department();
    if (!dept) return;
    this.saving = true;
    const payload: any = { ...this.form, department: dept._id };
    if (!payload.cellgroup) delete payload.cellgroup;
    this.visitorApi.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.modalOpen = false;
        this.form = { name: '', contact: '', cellgroup: '', prayerRequest: '' };
        this.load();
      },
      error: () => (this.saving = false)
    });
  }
}

import { Component, OnInit, Injector, effect, inject, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartmentStore } from '../../core/services/department-store.service';
import { MemberService, MemberRecord } from '../../core/services/member.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/tables/data-table.component';

@Component({
  selector: 'app-followup-center',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableComponent],
  template: `
    <app-page-header title="Follow-up Center" subtitle="Members flagged as needing follow-up"></app-page-header>
    <app-data-table [columns]="columns" [rows]="members" [loading]="loading" emptyLabel="No one needs follow-up right now 🎉"></app-data-table>
  `
})
export class FollowupCenterComponent implements OnInit {
  private store = inject(DepartmentStore);
  private injector = inject(Injector);
  private memberApi = inject(MemberService);

  members: MemberRecord[] = [];
  loading = true;
  columns: TableColumn[] = [
    { key: 'name', label: 'Name', render: (m) => `${m.firstName} ${m.lastName}` },
    { key: 'cellgroup', label: 'Cellgroup', render: (m) => m.cellgroup?.name || '—' },
    { key: 'contact', label: 'Contact', render: (m) => m.contact || '—' },
    { key: 'status', label: 'Status', badge: (m) => ({ status: m.status, label: 'Needs Follow-up' }) }
  ];

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const dept = this.store.department();
        if (!dept) return;
        this.loading = true;
        this.memberApi.list({ department: dept._id, status: 'needs_followup' }).subscribe({
          next: (res) => { this.members = res.data; this.loading = false; },
          error: () => (this.loading = false)
        });
      }, { allowSignalWrites: true });
    });
  }
}

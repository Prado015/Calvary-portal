import { Component, OnInit, Injector, effect, inject, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { DepartmentStore } from '../../core/services/department-store.service';
import { CellgroupService, CellgroupRecord } from '../../core/services/cellgroup.service';
import { MemberService, MemberStats } from '../../core/services/member.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { StatisticCardComponent } from '../../shared/components/cards/statistic-card.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';

@Component({
  selector: 'app-cellgroups-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, StatisticCardComponent, ButtonComponent],
  template: `
    <app-page-header title="Cellgroups" [subtitle]="store.department() ? store.department()!.name + ' cellgroups' : ''">
      <div actions *ngIf="canCreate" class="w-44"><app-button (click)="formOpen = true">Add Cellgroup</app-button></div>
    </app-page-header>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <a *ngFor="let cg of cellgroups" [routerLink]="[cg._id]" class="block hover:opacity-90 transition-opacity" title="Open monitoring report">
        <app-statistic-card icon="users-round" iconBg="bg-blue-500/70"
          [label]="cg.name" [value]="counts[cg._id]?.total ?? '—'" [sublabel]="(counts[cg._id]?.active ?? 0) + ' active · open report'">
        </app-statistic-card>
      </a>
      <p *ngIf="!cellgroups.length" class="text-brand-muted text-sm">No cellgroups yet for this department.</p>
    </div>

    <div *ngIf="formOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-sm">
        <h3 class="text-white font-bold mb-4">Add Cellgroup</h3>
        <input [(ngModel)]="name" name="name" placeholder="e.g. Faith Builders (Cell 1)" required class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
        <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="formOpen = false">Cancel</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Create' }}</app-button>
        </div>
      </form>
    </div>
  `
})
export class CellgroupsListComponent implements OnInit {
  store = inject(DepartmentStore);
  private injector = inject(Injector);
  private cellgroupApi = inject(CellgroupService);
  private memberApi = inject(MemberService);
  private auth = inject(AuthService);
  private permissions = inject(PermissionsService);

  // server: only super_admin / head_usher may create cellgroups
  canCreate = this.permissions.isSystemAdmin(this.auth.user());
  cellgroups: CellgroupRecord[] = [];
  counts: Partial<Record<string, MemberStats>> = {};
  formOpen = false;
  name = '';
  saving = false;
  error = '';

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => { if (this.store.department()) this.load(); }, { allowSignalWrites: true });
    });
  }

  load(): void {
    const dept = this.store.department();
    if (!dept) return;
    this.cellgroupApi.list({ department: dept._id }).subscribe((list) => {
      this.cellgroups = list;
      if (!list.length) return;
      forkJoin(list.map((cg) =>
        this.memberApi.stats({ department: dept._id, cellgroup: cg._id }).pipe(catchError(() => of({ total: 0, active: 0, needsFollowup: 0, inactive: 0 })))
      )).subscribe((all) => list.forEach((cg, i) => (this.counts[cg._id] = all[i])));
    });
  }

  save(): void {
    const dept = this.store.department();
    if (!dept) return;
    this.saving = true; this.error = '';
    this.cellgroupApi.create({ name: this.name.trim(), department: dept._id }).subscribe({
      next: () => { this.saving = false; this.formOpen = false; this.name = ''; this.load(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not create cellgroup'; }
    });
  }
}

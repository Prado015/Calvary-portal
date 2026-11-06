import { Component, Injector, OnInit, effect, inject, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import { DepartmentStore } from '../../core/services/department-store.service';
import { DepartmentService, DepartmentRecord } from '../../core/services/department.service';
import { CellgroupService, CellgroupRecord } from '../../core/services/cellgroup.service';
import { MemberService, QrCard } from '../../core/services/member.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { AvatarComponent } from '../../shared/components/common/avatar.component';

type CardView = QrCard & { qr: string };

// Printable member ID cards. Each QR contains a signed code that only this system can read.
@Component({
  selector: 'app-qr-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, AvatarComponent],
  template: `
    <div class="print:hidden">
      <app-page-header title="QR Cards" subtitle="Print a card for each member — scan it at the door to mark attendance">
        <button actions type="button" (click)="print()" [disabled]="!cards.length"
                class="h-11 px-5 rounded-brand bg-gold-btn text-navy text-sm font-semibold disabled:opacity-40">Print {{ cards.length ? '(' + cards.length + ')' : '' }}</button>
      </app-page-header>

      <div class="flex flex-wrap gap-2 mb-4">
        <select *ngIf="!store" [(ngModel)]="departmentId" (ngModelChange)="onDepartmentChange()" class="h-10 bg-navy-card border border-brand-border rounded-brand text-sm px-3 text-brand-text">
          <option value="">Choose a ministry…</option>
          <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
        </select>
        <select *ngIf="cellgroups.length" [(ngModel)]="cellgroupId" (ngModelChange)="load()" class="h-10 bg-navy-card border border-brand-border rounded-brand text-sm px-3 text-brand-text">
          <option value="">All cellgroups</option>
          <option *ngFor="let c of cellgroups" [value]="c._id">{{ c.name }}</option>
        </select>
      </div>
      <p *ngIf="!departmentId && !store" class="text-sm text-brand-muted">Choose a ministry to see its cards.</p>
      <p *ngIf="loading" class="text-sm text-brand-muted">Making cards…</p>
      <p *ngIf="error" class="text-sm text-brand-error">{{ error }}</p>
      <p *ngIf="cards.length" class="text-xs text-brand-muted mb-3">Tip: print on A4 paper, cut along the cards, and laminate. Members can also keep a photo of their card on their phone.</p>
    </div>

    <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2 print:gap-2">
      <div *ngFor="let c of cards" class="break-inside-avoid bg-white text-[#0d1525] rounded-xl overflow-hidden border border-gray-300 flex">
        <div class="flex-1 min-w-0 p-3 flex flex-col">
          <p class="text-[9px] font-bold tracking-[0.15em] text-[#b8860b] uppercase">Calvary Tabernacle</p>
          <div class="flex items-center gap-2.5 mt-2">
            <app-avatar [name]="c.firstName + ' ' + c.lastName" [src]="c.photoUrl" [size]="52"></app-avatar>
            <div class="min-w-0">
              <p class="font-bold leading-tight text-[15px] break-words">{{ c.firstName }} {{ c.lastName }}</p>
              <p class="text-[11px] text-gray-600 truncate">{{ c.cellgroup || 'No cellgroup' }}</p>
              <p class="text-[10px] text-gray-500 truncate">{{ c.department }}</p>
            </div>
          </div>
          <p class="mt-auto pt-2 text-[10px] text-gray-500">{{ c.memberId }}</p>
        </div>
        <div class="shrink-0 p-2 flex items-center bg-white">
          <img [src]="c.qr" [alt]="'QR code for ' + c.firstName" class="w-[104px] h-[104px]" />
        </div>
      </div>
    </div>
  `
})
export class QrCardsComponent implements OnInit {
  store = inject(DepartmentStore, { optional: true });
  private injector = inject(Injector);
  private deptApi = inject(DepartmentService);
  private cgApi = inject(CellgroupService);
  private memberApi = inject(MemberService);

  departments: DepartmentRecord[] = [];
  cellgroups: CellgroupRecord[] = [];
  departmentId = '';
  cellgroupId = '';
  cards: CardView[] = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    if (this.store) {
      const store = this.store;
      runInInjectionContext(this.injector, () => {
        effect(() => {
          const dept = store.department();
          if (!dept) return;
          this.departmentId = dept._id;
          this.loadCellgroups();
          this.load();
        }, { allowSignalWrites: true });
      });
    } else {
      this.deptApi.list().subscribe((d) => (this.departments = d));
    }
  }

  onDepartmentChange(): void { this.cellgroupId = ''; this.cards = []; this.loadCellgroups(); this.load(); }

  private loadCellgroups(): void {
    this.cellgroups = [];
    if (this.departmentId) this.cgApi.list({ department: this.departmentId }).subscribe((l) => (this.cellgroups = l));
  }

  load(): void {
    if (!this.departmentId && !this.cellgroupId) { this.cards = []; return; }
    this.loading = true; this.error = '';
    const params: Record<string, string> = {};
    if (this.departmentId) params['department'] = this.departmentId;
    if (this.cellgroupId) params['cellgroup'] = this.cellgroupId;
    this.memberApi.qrCards(params).subscribe({
      next: async (list) => {
        this.cards = await Promise.all(list.map(async (c) => ({
          ...c, qr: await QRCode.toDataURL(c.token, { errorCorrectionLevel: 'M', margin: 1, width: 240, color: { dark: '#0d1525', light: '#ffffff' } })
        })));
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.error = e.error?.message || 'Could not load the cards'; }
    });
  }

  print(): void { window.print(); }
}

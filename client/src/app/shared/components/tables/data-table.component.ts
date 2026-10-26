import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgeComponent } from '../common/status-badge.component';

export interface TableColumn {
  key: string;
  label: string;
  render?: (row: any) => string;
  badge?: (row: any) => { status: string; label?: string };
  actions?: boolean; // renders the actionsTemplate in this column
}

// One generic table used by Members, Visitors, Ushers, Baptism, etc.
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  template: `
    <div *ngIf="loading" class="text-center py-12 text-brand-muted text-sm">Loading…</div>
    <div *ngIf="!loading && !rows.length" class="text-center py-12 text-brand-muted text-sm">{{ emptyLabel }}</div>

    <div *ngIf="!loading && rows.length" class="overflow-x-auto rounded-brand border border-brand-border">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-navy-input text-brand-muted text-xs uppercase tracking-wide">
            <th *ngFor="let c of columns" class="text-left px-4 py-3 font-medium">{{ c.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows"
              (click)="rowClick.emit(row)"
              [class]="'border-t border-brand-border ' + (clickable ? 'cursor-pointer hover:bg-navy-input/60' : '')">
            <td *ngFor="let c of columns" class="px-4 py-3 text-brand-text">
              <ng-container *ngIf="c.actions && actionsTemplate">
                <ng-container *ngTemplateOutlet="actionsTemplate; context: { $implicit: row }"></ng-container>
              </ng-container>
              <ng-container *ngIf="!c.actions">
                <app-status-badge *ngIf="c.badge" [status]="c.badge(row).status" [label]="c.badge(row).label || c.badge(row).status"></app-status-badge>
                <span *ngIf="!c.badge">{{ c.render ? c.render(row) : row[c.key] }}</span>
              </ng-container>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class DataTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() loading = false;
  @Input() emptyLabel = 'No records found';
  @Input() clickable = false;
  @Input() actionsTemplate: TemplateRef<any> | null = null;
  @Output() rowClick = new EventEmitter<any>();
}

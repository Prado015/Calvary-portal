import { Injectable, signal } from '@angular/core';
import { DepartmentService, DepartmentRecord } from './department.service';

// Angular equivalent of the React DepartmentContext. Provided at the
// PortalLayout component level (providers: [DepartmentStore]) so every page
// inside one portal shares a single fetch of the department record instead
// of each page calling getBySlug independently.
@Injectable()
export class DepartmentStore {
  readonly department = signal<DepartmentRecord | null>(null);
  readonly loading = signal(true);
  private loadedSlug: string | null = null;

  constructor(private api: DepartmentService) {}

  load(slug: string): void {
    if (this.loadedSlug === slug) return;
    this.loadedSlug = slug;
    this.loading.set(true);
    this.api.getBySlug(slug).subscribe({
      next: (d) => { this.department.set(d); this.loading.set(false); },
      error: () => { this.department.set(null); this.loading.set(false); }
    });
  }
}

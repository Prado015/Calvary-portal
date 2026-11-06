import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

// Round member photo — falls back to initials when there is no photo (or it fails to load).
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shrink-0 rounded-full overflow-hidden bg-navy-input border border-brand-border flex items-center justify-center text-gold-light font-semibold select-none"
         [style.width.px]="size" [style.height.px]="size" [style.font-size.px]="size * 0.36">
      <img *ngIf="src && !failed" [src]="src" [alt]="name" class="w-full h-full object-cover" loading="lazy" (error)="failed = true" />
      <span *ngIf="!src || failed">{{ initials }}</span>
    </div>
  `
})
export class AvatarComponent implements OnChanges {
  @Input() name = '';
  @Input() src: string | null | undefined = '';
  @Input() size = 40;

  failed = false;
  initials = '';

  ngOnChanges(): void {
    this.failed = false;
    const parts = this.name.trim().split(/\s+/).filter(Boolean);
    this.initials = ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
}

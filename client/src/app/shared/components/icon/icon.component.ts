import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// A small, dependable inline-SVG icon set — avoids depending on an icon
// library whose exact Angular API we can't verify here. Add more `case`
// entries as new icons are needed; every icon shares the same 24x24,
// stroke="currentColor" shape so they drop in anywhere text color is set.
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         [class]="extraClass">
      <ng-container [ngSwitch]="name">
        <ng-container *ngSwitchCase="'lock'">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </ng-container>
        <ng-container *ngSwitchCase="'user'">
          <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>
        </ng-container>
        <ng-container *ngSwitchCase="'eye'">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>
        </ng-container>
        <ng-container *ngSwitchCase="'eye-off'">
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.52 13.52 0 0 0 1 11s4 7 11 7a9.26 9.26 0 0 0 5.39-1.61"/>
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>
        </ng-container>
        <ng-container *ngSwitchCase="'chevron-down'"><path d="M6 9l6 6 6-6"/></ng-container>
        <ng-container *ngSwitchCase="'landmark'">
          <path d="M3 22h18"/><path d="M4 10h16"/><path d="M4 22V10"/><path d="M20 22V10"/><path d="M12 2 2 8h20L12 2Z"/>
        </ng-container>
        <ng-container *ngSwitchCase="'bell'">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </ng-container>
        <ng-container *ngSwitchCase="'menu'"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></ng-container>
        <ng-container *ngSwitchCase="'users'">
          <circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M17 11a4 4 0 1 0 0-8"/><path d="M22 21c0-3-2-5.5-5-6.5"/>
        </ng-container>
        <ng-container *ngSwitchCase="'user-plus'">
          <circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M19 8v6"/><path d="M16 11h6"/>
        </ng-container>
        <ng-container *ngSwitchCase="'users-round'">
          <circle cx="9" cy="7" r="4"/><circle cx="17" cy="9" r="3"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M15 15c2.5.5 4 2 4 6"/>
        </ng-container>
        <ng-container *ngSwitchCase="'clipboard-check'">
          <rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 3h6v3H9z"/><path d="M9 13l2 2 4-4"/>
        </ng-container>
        <ng-container *ngSwitchCase="'clipboard-list'">
          <rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 3h6v3H9z"/><path d="M9 12h6"/><path d="M9 16h6"/>
        </ng-container>
        <ng-container *ngSwitchCase="'bar-chart-3'"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></ng-container>
        <ng-container *ngSwitchCase="'heart-handshake'">
          <path d="M12 6c-1.5-2-4-3-6-1.5S3 9 5 11l7 7 7-7c2-2 2.5-4.5.5-6.5S16 2 14 4l-1 1-1-1Z"/>
        </ng-container>
        <ng-container *ngSwitchCase="'search'"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></ng-container>
        <ng-container *ngSwitchCase="'user-check'"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M16 11l2 2 4-4"/></ng-container>
        <ng-container *ngSwitchCase="'user-x'"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M17 8l5 5"/><path d="M22 8l-5 5"/></ng-container>
        <ng-container *ngSwitchCase="'shield-check'"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z"/><path d="M9 12l2 2 4-4"/></ng-container>
        <ng-container *ngSwitchCase="'droplet'"><path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13Z"/></ng-container>
        <ng-container *ngSwitchCase="'calculator'"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/><path d="M8 19h.01"/><path d="M12 19h.01"/><path d="M16 19h.01"/></ng-container>
        <ng-container *ngSwitchCase="'settings'"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.42.5.75 1 .91.17.06.34.09.51.09H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></ng-container>
        <ng-container *ngSwitchCase="'pencil'"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></ng-container>
        <ng-container *ngSwitchCase="'trash-2'"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></ng-container>
        <ng-container *ngSwitchCase="'layout-dashboard'"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></ng-container>
        <ng-container *ngSwitchCase="'scan-line'"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></ng-container>
        <ng-container *ngSwitchDefault><circle cx="12" cy="12" r="9"/></ng-container>
      </ng-container>
    </svg>
  `
})
export class IconComponent {
  @Input() name = '';
  @Input() size = 18;
  @Input() extraClass = '';
}

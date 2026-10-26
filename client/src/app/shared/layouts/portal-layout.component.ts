import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentStore } from '../../core/services/department-store.service';
import { IconComponent } from '../components/icon/icon.component';

export const PORTAL_NAV = [
  { key: 'dashboard',  label: 'Dashboard',        icon: 'layout-dashboard', path: '' },
  { key: 'members',    label: 'Members',          icon: 'users',            path: 'members' },
  { key: 'visitors',   label: 'Visitors',         icon: 'user-plus',        path: 'visitors' },
  { key: 'cellgroups', label: 'Cellgroups',       icon: 'users-round',      path: 'cellgroups' },
  { key: 'attendance', label: 'Attendance',       icon: 'clipboard-check',  path: 'attendance' },
  { key: 'followup',   label: 'Follow-up Center', icon: 'heart-handshake',  path: 'followup' },
  { key: 'reports',    label: 'Reports',          icon: 'bar-chart-3',      path: 'reports' },
  { key: 'settings',   label: 'Settings',         icon: 'settings',         path: 'settings' }
];

// The one layout every ministry portal (Youth, LM, AMM, ...) renders inside.
// Only :slug and the data change between portals — the chrome is identical.
@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  providers: [DepartmentStore],
  template: `
    <div class="min-h-screen bg-navy text-brand-text flex">
      <aside [class]="'bg-navy-card border-r border-brand-border flex flex-col transition-all ' + (collapsed ? 'w-16' : 'w-60')">
        <div class="h-16 flex items-center gap-3 px-4 border-b border-brand-border">
          <div class="w-8 h-8 rounded bg-gold-btn flex items-center justify-center text-navy font-bold text-xs">CT</div>
          <div *ngIf="!collapsed" class="leading-tight">
            <p class="text-sm font-bold text-white">Calvary Tabernacle</p>
            <p class="text-[10px] text-gold-light uppercase tracking-wide">{{ store.department()?.name || slug }}</p>
          </div>
        </div>
        <nav class="flex-1 py-4 px-2 space-y-1">
          <a *ngFor="let item of nav"
             [routerLink]="link(item.path)"
             routerLinkActive="bg-gold/15 text-gold-light font-medium"
             [routerLinkActiveOptions]="{ exact: item.path === '' }"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:bg-navy-input hover:text-brand-text transition-colors">
            <app-icon [name]="item.icon" [size]="17"></app-icon>
            <span *ngIf="!collapsed">{{ item.label }}</span>
          </a>
        </nav>
      </aside>

      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-16 border-b border-brand-border flex items-center justify-between px-6">
          <button (click)="collapsed = !collapsed" class="text-brand-muted hover:text-brand-text"><app-icon name="menu" [size]="20"></app-icon></button>
          <div class="flex items-center gap-4">
            <app-icon name="bell" [size]="19" extraClass="text-brand-muted"></app-icon>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-gold-btn flex items-center justify-center text-navy text-xs font-bold">
                {{ auth.user()?.firstName?.[0] }}{{ auth.user()?.lastName?.[0] }}
              </div>
              <div class="text-sm leading-tight">
                <p class="font-medium">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</p>
                <button (click)="logout()" class="text-xs text-brand-muted hover:text-gold-light">Log out</button>
              </div>
            </div>
          </div>
        </header>
        <main class="flex-1 overflow-y-auto p-6"><router-outlet></router-outlet></main>
      </div>
    </div>
  `
})
export class PortalLayoutComponent implements OnInit {
  nav = PORTAL_NAV;
  collapsed = false;
  slug = '';

  constructor(public auth: AuthService, public store: DepartmentStore, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      this.slug = p.get('slug') || '';
      if (this.slug) this.store.load(this.slug);
    });
  }

  link(path: string): string[] {
    return path ? ['/portal', this.slug, path] : ['/portal', this.slug];
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

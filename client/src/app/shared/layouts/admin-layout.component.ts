import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../components/icon/icon.component';

export const ADMIN_NAV: { key: string; label: string; icon: string; path: string; badge?: string; roles?: string[] }[] = [
  { key: 'overview',   label: 'Overview',           icon: 'layout-dashboard', path: '' },
  { key: 'checker',    label: 'Attendance Checker', icon: 'clipboard-check',  path: 'attendance-checker' },
  { key: 'ushers',     label: 'Ushers',             icon: 'user-plus',        path: 'ushers' },
  { key: 'members',    label: 'Members',            icon: 'users',            path: 'members', badge: 'NEW' },
  { key: 'baptism',    label: 'Baptism',            icon: 'droplet',          path: 'baptism' },
  { key: 'departments', label: 'Departments',      icon: 'landmark',         path: 'departments', roles: ['super_admin'] },
  { key: 'cellgroups',  label: 'Cellgroups',        icon: 'users-round',      path: 'cellgroups',  roles: ['super_admin', 'head_usher'] },
  { key: 'services',   label: 'Service Schedule',   icon: 'clipboard-list',   path: 'services', roles: ['super_admin', 'head_usher'] },
  { key: 'users',      label: 'User Accounts',      icon: 'user-check',       path: 'users',    roles: ['super_admin'] },
  { key: 'reports',    label: 'Reports',            icon: 'bar-chart-3',      path: 'reports' },
  { key: 'settings',   label: 'Settings',           icon: 'settings',         path: 'settings' }
];

@Component({
  sele~or: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="min-h-screen bg-navy text-brand-text flex">
      <aside class="w-60 bg-navy-card border-r border-brand-border flex flex-col">
        <div class="h-16 flex items-center gap-3 px-4 border-b border-brand-border">
          <div class="w-8 h-8 rounded bg-gold-btn flex items-center justify-center text-navy font-bold text-xs">CT</div>
          <div class="leading-tight">
            <p class="text-sm font-bold text-white">Calvary Tabernacle</p>
            <p class="text-[10px] text-gold-light uppercase tracking-wide">Head Usher / Admin</p>
          </div>
        </div>
        <nav class="flex-1 py-4 px-2 space-y-1">
          <a *ngFor="let item of visibleNav()"
             [routerLink]="link(item.path)"
             routerLinkActive="bg-gold/15 text-gold-light font-medium"
             [routerLinkActiveOptions]="{ exact: item.path === '' }"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:bg-navy-input hover:text-brand-text transition-colors">
            <app-icon [name]="item.icon" [size]="17"></app-icon>
            <span class="flex-1">{{ item.label }}</span>
            <span *ngIf="item.badge" class="text-[9px] bg-brand-green text-navy font-bold px-1.5 py-0.5 rounded">{{ item.badge }}</span>
          </a>
        </nav>
      </aside>
      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-16 border-b border-brand-border flex items-center justify-end px-6 gap-3">
          <span class="text-sm">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</span>
          <button (click)="logout()" class="text-xs text-brand-muted hover:text-gold-light">Logout</button>
        </header>
        <main class="flex-1 overflow-y-auto p-6"><router-outlet></router-outlet></main>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {
  nav = ADMIN_NAV;
  constructor(public auth: AuthService, private router: Router) {}
  link(path: string): string[] { return path ? ['/admin', path] : ['/admin']; }
  visibleNav() {
    const role = this.auth.user()?.role;
    return this.nav.filter((i) => !i.roles || (role && i.roles.includes(role)));
  }
  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
}

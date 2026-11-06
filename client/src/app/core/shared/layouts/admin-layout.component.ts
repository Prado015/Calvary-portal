import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppShellComponent, ShellNavItem } from './app-shell.component';

export const ADMIN_NAV: { key: string; label: string; icon: string; path: string; badge?: string; roles?: string[] }[] = [
  { key: 'overview',   label: 'Overview',           icon: 'layout-dashboard', path: '' },
  { key: 'checker',    label: 'Attendance Checker', icon: 'clipboard-check',  path: 'attendance-checker' },
  { key: 'qr',         label: 'QR Check-in',        icon: 'scan-line',        path: 'qr-checkin' },
  { key: 'followup',   label: 'Follow-up Center',   icon: 'heart-handshake',  path: 'followup' },
  { key: 'qrcards',    label: 'QR Cards',           icon: 'qr-code',          path: 'qr-cards' },
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

const SHORT_LABELS: Record<string, string> = { checker: 'Attendance', qr: 'Scan' };

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [AppShellComponent],
  template: `
    <app-shell
      [items]="items()"
      subtitle="Head Usher / Admin"
      [userName]="userName()"
      [initials]="initials()"
      [primaryKeys]="primaryKeys"
      (logout)="logout()"></app-shell>
  `
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  primaryKeys = ['overview', 'qr', 'checker', 'members'];

  items = computed<ShellNavItem[]>(() => {
    const role = this.auth.user()?.role;
    return ADMIN_NAV
      .filter((i) => !i.roles || (role && i.roles.includes(role)))
      .map((i) => ({
        key: i.key, label: i.label, short: SHORT_LABELS[i.key], icon: i.icon, badge: i.badge,
        link: i.path ? ['/admin', i.path] : ['/admin'],
        exact: i.path === ''
      }));
  });

  userName = computed(() => `${this.auth.user()?.firstName ?? ''} ${this.auth.user()?.lastName ?? ''}`.trim());
  initials = computed(() => `${this.auth.user()?.firstName?.[0] ?? ''}${this.auth.user()?.lastName?.[0] ?? ''}`.toUpperCase());

  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
}

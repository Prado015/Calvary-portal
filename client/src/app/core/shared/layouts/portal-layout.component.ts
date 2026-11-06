import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentStore } from '../../core/services/department-store.service';
import { AppShellComponent, ShellNavItem } from './app-shell.component';

export const PORTAL_NAV = [
  { key: 'dashboard',  label: 'Dashboard',        icon: 'layout-dashboard', path: '' },
  { key: 'members',    label: 'Members',          icon: 'users',            path: 'members' },
  { key: 'visitors',   label: 'Visitors',         icon: 'user-plus',        path: 'visitors' },
  { key: 'cellgroups', label: 'Cellgroups',       icon: 'users-round',      path: 'cellgroups' },
  { key: 'attendance', label: 'Attendance',       icon: 'clipboard-check',  path: 'attendance' },
  { key: 'qr',         label: 'QR Check-in',      icon: 'scan-line',        path: 'qr-checkin' },
  { key: 'qrcards',    label: 'QR Cards',         icon: 'qr-code',          path: 'qr-cards' },
  { key: 'followup',   label: 'Follow-up Center', icon: 'heart-handshake',  path: 'followup' },
  { key: 'reports',    label: 'Reports',          icon: 'bar-chart-3',      path: 'reports' },
  { key: 'settings',   label: 'Settings',         icon: 'settings',         path: 'settings' }
];

// The one layout every ministry portal (Youth, LM, AMM, ...) renders inside.
// Only :slug and the data change between portals — the chrome is identical.
@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [AppShellComponent],
  providers: [DepartmentStore],
  template: `
    <app-shell
      [items]="items()"
      [subtitle]="subtitle()"
      [userName]="userName()"
      [initials]="initials()"
      [showBell]="true"
      [primaryKeys]="primaryKeys"
      (logout)="logout()"></app-shell>
  `
})
export class PortalLayoutComponent implements OnInit {
  auth = inject(AuthService);
  store = inject(DepartmentStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  slug = signal('');
  primaryKeys = ['dashboard', 'members', 'attendance', 'qr'];

  items = computed<ShellNavItem[]>(() =>
    PORTAL_NAV.map((i) => ({
      key: i.key, label: i.label, short: i.key === 'qr' ? 'Scan' : undefined, icon: i.icon,
      link: i.path ? ['/portal', this.slug(), i.path] : ['/portal', this.slug()],
      exact: i.path === ''
    }))
  );

  subtitle = computed(() => this.store.department()?.name || this.slug());
  userName = computed(() => `${this.auth.user()?.firstName ?? ''} ${this.auth.user()?.lastName ?? ''}`.trim());
  initials = computed(() => `${this.auth.user()?.firstName?.[0] ?? ''}${this.auth.user()?.lastName?.[0] ?? ''}`.toUpperCase());

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      const s = p.get('slug') || '';
      this.slug.set(s);
      if (s) this.store.load(s);
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

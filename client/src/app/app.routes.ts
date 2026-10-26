import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ADMIN_ROLES } from './core/services/permissions.service';

// Every feature is lazy-loaded (loadComponent) — Angular's route-level code
// splitting, so each page's JS only downloads when its route is visited.
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },

  // Ministry portals — Youth, LM, AMM, ... all share PortalLayout + these pages.
  {
    path: 'portal/:slug',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layouts/portal-layout.component').then(m => m.PortalLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/dashboard/portal-dashboard.component').then(m => m.PortalDashboardComponent) },
      { path: 'members', loadComponent: () => import('./features/members/members-list.component').then(m => m.MembersListComponent) },
      { path: 'visitors', loadComponent: () => import('./features/visitors/visitors-list.component').then(m => m.VisitorsListComponent) },
      { path: 'cellgroups', loadComponent: () => import('./features/cellgroups/cellgroups-list.component').then(m => m.CellgroupsListComponent) },
      { path: 'cellgroups/:id', loadComponent: () => import('./features/cellgroups/cellgroup-report.component').then(m => m.CellgroupReportComponent) },
      { path: 'attendance', loadComponent: () => import('./features/attendance-checker/attendance-checker.component').then(m => m.AttendanceCheckerComponent) },
      { path: 'followup', loadComponent: () => import('./features/followup/followup-center.component').then(m => m.FollowupCenterComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) }
    ]
  },

  // Admin / Head Usher back office
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { roles: ADMIN_ROLES },
    loadComponent: () => import('./shared/layouts/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/admin/admin-overview.component').then(m => m.AdminOverviewComponent) },
      { path: 'attendance-checker', loadComponent: () => import('./features/attendance-checker/attendance-checker.component').then(m => m.AttendanceCheckerComponent) },
      { path: 'departments', canActivate: [authGuard], data: { roles: ['super_admin'] }, loadComponent: () => import('./features/departments/departments-admin.component').then(m => m.DepartmentsAdminComponent) },
      { path: 'cellgroups', canActivate: [authGuard], data: { roles: ['super_admin', 'head_usher'] }, loadComponent: () => import('./features/cellgroups/cellgroups-admin.component').then(m => m.CellgroupsAdminComponent) },
      { path: 'ushers', loadComponent: () => import('./features/ushers/ushers-list.component').then(m => m.UshersListComponent) },
      { path: 'members', loadComponent: () => import('./features/members/members-list.component').then(m => m.MembersListComponent) },
      { path: 'baptism', loadComponent: () => import('./features/baptism/baptism-list.component').then(m => m.BaptismListComponent) },
      { path: 'services', canActivate: [authGuard], data: { roles: ['super_admin', 'head_usher'] }, loadComponent: () => import('./features/services/services-list.component').then(m => m.ServicesListComponent) },
      { path: 'users', canActivate: [authGuard], data: { roles: ['super_admin'] }, loadComponent: () => import('./features/users/users-list.component').then(m => m.UsersListComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) }
    ]
  },

  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];

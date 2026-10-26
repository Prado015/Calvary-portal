import { Injectable } from '@angular/core';
import { CurrentUser } from './auth.service';

export const ADMIN_ROLES = ['super_admin', 'head_usher', 'usher_secretary', 'usher', 'counter_staff'];

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  getPortalPath(user: CurrentUser | null): string {
    if (!user) return '/login';
    if (user.department?.slug) return `/portal/${user.department.slug}`;
    if (ADMIN_ROLES.includes(user.role)) return '/admin';
    return '/login';
  }

  canManage(user: CurrentUser | null): boolean {
    return !!user && ['super_admin', 'head_usher', 'usher_secretary'].includes(user.role);
  }

  isSystemAdmin(user: CurrentUser | null): boolean {
    return !!user && ['super_admin', 'head_usher'].includes(user.role);
  }
}

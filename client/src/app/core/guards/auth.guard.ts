import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Functional guard (Angular 15+) — equivalent to React's <ProtectedRoute>.
// Optional `data: { roles: [...] }` on the route restricts by role too.
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) {
    router.navigate(['/login']);
    return false;
  }

  const requiredRoles = route.data?.['roles'] as string[] | undefined;
  const user = auth.user();
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

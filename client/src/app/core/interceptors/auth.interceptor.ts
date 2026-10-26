import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

// Attaches the bearer token to every /api request and redirects to /login
// on a 401 — the Angular equivalent of the axios interceptors in the
// previous React build.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('ct_token');

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401) {
        localStorage.removeItem('ct_token');
        localStorage.removeItem('ct_user');
        if (!router.url.includes('/login')) router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};

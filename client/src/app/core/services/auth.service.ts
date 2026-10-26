import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';

export interface Department { id: string; name: string; slug: string; }
export interface CurrentUser {
  id: string; firstName: string; lastName: string; email: string;
  role: string; status: string; department: Department | null;
}

// Angular equivalent of the React AuthContext — a signal-based service
// instead of context + hooks, same responsibilities: hold the user,
// expose login/logout, persist the token.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSignal = signal<CurrentUser | null>(this.readStoredUser());
  readonly user = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);

  constructor(private http: HttpClient) {}

  private readStoredUser(): CurrentUser | null {
    const raw = localStorage.getItem('ct_user');
    return raw ? JSON.parse(raw) : null;
  }

  login(email: string, password: string): Observable<{ token: string; user: CurrentUser }> {
    return this.http.post<{ success: boolean; token: string; user: CurrentUser }>('/api/auth/login', { email, password }).pipe(
      tap((res) => {
        localStorage.setItem('ct_token', res.token);
        localStorage.setItem('ct_user', JSON.stringify(res.user));
        this.userSignal.set(res.user);
      })
    );
  }

  me(): Observable<CurrentUser> {
    return this.http.get<{ success: boolean; user: CurrentUser }>('/api/auth/me').pipe(
      tap((res) => {
        localStorage.setItem('ct_user', JSON.stringify(res.user));
        this.userSignal.set(res.user);
      }),
      map((res) => res.user)
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>('/api/auth/password', { currentPassword, newPassword });
  }

  logout(): void {
    localStorage.removeItem('ct_token');
    localStorage.removeItem('ct_user');
    this.userSignal.set(null);
  }

  hasToken(): boolean {
    return Boolean(localStorage.getItem('ct_token'));
  }
}

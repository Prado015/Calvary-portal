import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}
  list(): Observable<any[]> { return this.http.get<{ data: any[] }>('/api/users').pipe(map(r => r.data)); }
  create(payload: any): Observable<any> { return this.http.post<{ data: any }>('/api/users', payload).pipe(map(r => r.data)); }
  update(id: string, payload: any): Observable<any> { return this.http.put<{ data: any }>(`/api/users/${id}`, payload).pipe(map(r => r.data)); }
}

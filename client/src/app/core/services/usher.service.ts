import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsherService {
  constructor(private http: HttpClient) {}

  list(params: Record<string, string> = {}): Observable<any[]> {
    return this.http.get<{ data: any[] }>('/api/ushers', { params }).pipe(map(r => r.data));
  }
  create(payload: any): Observable<any> {
    return this.http.post<{ data: any }>('/api/ushers', payload).pipe(map(r => r.data));
  }
  update(id: string, payload: any): Observable<any> {
    return this.http.put<{ data: any }>(`/api/ushers/${id}`, payload).pipe(map(r => r.data));
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/ushers/${id}`);
  }
}

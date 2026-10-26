import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BaptismService {
  constructor(private http: HttpClient) {}

  list(params: Record<string, string> = {}): Observable<any[]> {
    return this.http.get<{ data: any[] }>('/api/baptism', { params }).pipe(map(r => r.data));
  }
  create(payload: any): Observable<any> {
    return this.http.post<{ data: any }>('/api/baptism', payload).pipe(map(r => r.data));
  }
}

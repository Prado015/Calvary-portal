import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ServiceService {
  constructor(private http: HttpClient) {}

  today(): Observable<any | null> {
    return this.http.get<{ data: any | null }>('/api/services/today').pipe(map(r => r.data));
  }
  list(): Observable<any[]> {
    return this.http.get<{ data: any[] }>('/api/services').pipe(map(r => r.data));
  }
  create(payload: { name: string; serviceDate: string; startTime?: string; endTime?: string }): Observable<any> {
    return this.http.post<{ data: any }>('/api/services', payload).pipe(map(r => r.data));
  }
}

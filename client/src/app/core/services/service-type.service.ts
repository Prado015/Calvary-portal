import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface ServiceTypeRecord {
  _id: string; code?: string; name: string; kind: 'weekly' | 'custom'; weekday: number | null;
  departments: { _id: string; name: string; slug: string }[]; color: string; sortOrder: number; active: boolean;
}
export interface ServiceTypePayload {
  name: string; kind: 'weekly' | 'custom'; weekday: number | null; departments: string[]; color: string; active: boolean;
}

@Injectable({ providedIn: 'root' })
export class ServiceTypeService {
  constructor(private http: HttpClient) {}

  list(all = false): Observable<ServiceTypeRecord[]> {
    return this.http.get<{ data: ServiceTypeRecord[] }>('/api/service-types', { params: all ? { all: 'true' } : {} }).pipe(map((r) => r.data));
  }
  create(payload: ServiceTypePayload): Observable<ServiceTypeRecord> {
    return this.http.post<{ data: ServiceTypeRecord }>('/api/service-types', payload).pipe(map((r) => r.data));
  }
  update(id: string, payload: Partial<ServiceTypePayload>): Observable<ServiceTypeRecord> {
    return this.http.put<{ data: ServiceTypeRecord }>(`/api/service-types/${id}`, payload).pipe(map((r) => r.data));
  }
  remove(id: string): Observable<unknown> {
    return this.http.delete(`/api/service-types/${id}`);
  }
}

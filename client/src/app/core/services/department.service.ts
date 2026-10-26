import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface DepartmentRecord {
  _id: string; name: string; slug: string; description?: string; active?: boolean;
  memberCount?: number; cellgroupCount?: number; userCount?: number;
}
export interface DepartmentPayload { name: string; slug?: string; description?: string; active?: boolean; }

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  constructor(private http: HttpClient) {}

  listPublic(): Observable<DepartmentRecord[]> {
    return this.http.get<{ data: DepartmentRecord[] }>('/api/departments/public').pipe(map(r => r.data));
  }

  list(params: Record<string, string> = {}): Observable<DepartmentRecord[]> {
    return this.http.get<{ data: DepartmentRecord[] }>('/api/departments', { params }).pipe(map(r => r.data));
  }

  /** Every department (including inactive ones) with member / cellgroup / user counts. */
  listWithCounts(): Observable<DepartmentRecord[]> {
    return this.list({ active: 'false', withCounts: 'true' });
  }

  getBySlug(slug: string): Observable<DepartmentRecord> {
    return this.http.get<{ data: DepartmentRecord }>(`/api/departments/by-slug/${slug}`).pipe(map(r => r.data));
  }

  create(payload: DepartmentPayload): Observable<DepartmentRecord> {
    return this.http.post<{ data: DepartmentRecord }>('/api/departments', payload).pipe(map(r => r.data));
  }
  update(id: string, payload: Partial<DepartmentPayload>): Observable<DepartmentRecord> {
    return this.http.put<{ data: DepartmentRecord }>(`/api/departments/${id}`, payload).pipe(map(r => r.data));
  }
  remove(id: string): Observable<unknown> {
    return this.http.delete(`/api/departments/${id}`);
  }
}

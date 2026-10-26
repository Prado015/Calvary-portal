import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface CellgroupRecord {
  _id: string; name: string; department: any; leader?: any;
  leaderName?: string; assistantLeaders?: string[]; active?: boolean; memberCount?: number;
}
export interface CellgroupPayload {
  name: string; department: string; leaderName?: string; assistantLeaders?: string[]; active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CellgroupService {
  constructor(private http: HttpClient) {}

  list(params: Record<string, string> = {}): Observable<CellgroupRecord[]> {
    return this.http.get<{ data: CellgroupRecord[] }>('/api/cellgroups', { params }).pipe(map(r => r.data));
  }

  /** Every cellgroup (including turned-off ones) with member counts, optionally for one ministry. */
  listAll(departmentId = ''): Observable<CellgroupRecord[]> {
    const params: Record<string, string> = { includeInactive: 'true', withCounts: 'true' };
    if (departmentId) params['department'] = departmentId;
    return this.list(params);
  }

  create(payload: CellgroupPayload): Observable<CellgroupRecord> {
    return this.http.post<{ data: CellgroupRecord }>('/api/cellgroups', payload).pipe(map(r => r.data));
  }
  update(id: string, payload: Partial<CellgroupPayload>): Observable<CellgroupRecord> {
    return this.http.put<{ data: CellgroupRecord }>(`/api/cellgroups/${id}`, payload).pipe(map(r => r.data));
  }
  remove(id: string): Observable<unknown> {
    return this.http.delete(`/api/cellgroups/${id}`);
  }
}

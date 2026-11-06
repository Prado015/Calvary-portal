import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface FollowUpRow {
  member: any; missed: number; auto: boolean; manual: boolean;
  lastSeen: string | null; lastContact: string | null; lastContactMethod: string | null;
}
export interface FollowUpMeta { threshold: number; serviceType: string | null; heldServices: number; lookback: number; }
export interface FollowUpLog { _id: string; method: string; note: string; createdAt: string; by?: { firstName: string; lastName: string } | null; }

@Injectable({ providedIn: 'root' })
export class FollowupService {
  constructor(private http: HttpClient) {}

  list(params: Record<string, string>): Observable<{ data: FollowUpRow[]; meta: FollowUpMeta }> {
    return this.http.get<{ data: FollowUpRow[]; meta: FollowUpMeta }>('/api/followup', { params });
  }

  addLog(memberId: string, payload: { method: string; note: string }): Observable<unknown> {
    return this.http.post(`/api/followup/${memberId}/log`, payload);
  }

  logs(memberId: string): Observable<FollowUpLog[]> {
    return this.http.get<{ data: FollowUpLog[] }>(`/api/followup/${memberId}/logs`).pipe(map(r => r.data));
  }
}

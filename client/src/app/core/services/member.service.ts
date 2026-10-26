import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface MemberRecord {
  _id: string; memberId: string; firstName: string; lastName: string; middleInitial?: string;
  contact?: string; email?: string; gender?: string; status: string; dateJoined: string;
  age?: number | null; birthdate?: string | null; location?: string;
  occupationType?: string; occupationDetail?: string; ministries?: string[];
  cgPosition?: string; ageGroup?: string;
  profilingForm?: boolean; baptizedWater?: boolean; baptizedHolyGhost?: boolean;
  department?: any; cellgroup?: any;
}
export interface MemberListResponse { data: MemberRecord[]; total: number; page: number; pages: number; }
export interface MemberStats {
  total: number; active: number; needsFollowup: number; inactive: number;
  sundayGoer?: number; otherChurch?: number; bibleStudy?: number;
}

@Injectable({ providedIn: 'root' })
export class MemberService {
  constructor(private http: HttpClient) {}

  list(params: Record<string, string> = {}): Observable<MemberListResponse> {
    return this.http.get<MemberListResponse>('/api/members', { params });
  }

  stats(params: Record<string, string> = {}): Observable<MemberStats> {
    return this.http.get<{ data: MemberStats }>('/api/members/stats', { params }).pipe(map(r => r.data));
  }

  create(payload: Partial<MemberRecord>): Observable<MemberRecord> {
    return this.http.post<{ data: MemberRecord }>('/api/members', payload).pipe(map(r => r.data));
  }

  update(id: string, payload: Partial<MemberRecord>): Observable<MemberRecord> {
    return this.http.put<{ data: MemberRecord }>(`/api/members/${id}`, payload).pipe(map(r => r.data));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/members/${id}`);
  }
}
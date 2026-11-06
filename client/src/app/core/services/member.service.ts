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
  photoUrl?: string;
  department?: any; cellgroup?: any;
}
export interface MemberListResponse { data: MemberRecord[]; total: number; page: number; pages: number; }
export interface MemberStats {
  total: number; active: number; needsFollowup: number; inactive: number;
  sundayGoer?: number; otherChurch?: number; bibleStudy?: number;
}
export interface QrCard {
  _id: string; memberId: string; firstName: string; lastName: string; photoUrl: string;
  department: string; cellgroup: string; token: string;
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

  /** `image` is a data URL (data:image/jpeg;base64,...) already shrunk by the browser. */
  uploadPhoto(id: string, image: string): Observable<string> {
    return this.http.put<{ data: { photoUrl: string } }>(`/api/members/${id}/photo`, { image }).pipe(map(r => r.data.photoUrl));
  }

  deletePhoto(id: string): Observable<unknown> {
    return this.http.delete(`/api/members/${id}/photo`);
  }

  qrCards(params: Record<string, string>): Observable<QrCard[]> {
    return this.http.get<{ data: QrCard[] }>('/api/members/qr-cards', { params }).pipe(map(r => r.data));
  }
}

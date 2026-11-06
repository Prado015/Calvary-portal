import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface AttendanceOverviewPoint { date: string; present: number; rate: number; }
export interface CellgroupBreakdownRow { cellgroup: { id: string; name: string }; present: number; total: number; rate: number; }
export interface QrCheckInResult {
  already: boolean; status: 'present' | 'late'; checkedInAt: string | null;
  member: { _id: string; name: string; photoUrl: string; cellgroup: string; department: string; status: string };
}

@Injectable({ providedIn: 'root' })
export class MemberAttendanceService {
  constructor(private http: HttpClient) {}

  forService(params: Record<string, string>): Observable<any[]> {
    return this.http.get<{ data: any[] }>('/api/member-attendance', { params }).pipe(map(r => r.data));
  }

  checkIn(payload: { member: string; service: string; date: string; status?: string; source?: string }): Observable<any> {
    return this.http.post<{ data: any }>('/api/member-attendance/check-in', payload).pipe(map(r => r.data));
  }

  /** Scan a member's QR card at the door. */
  qrCheckIn(payload: { token: string; typeId: string; date: string; status?: 'present' | 'late' }): Observable<QrCheckInResult> {
    return this.http.post<QrCheckInResult & { success: boolean }>('/api/member-attendance/qr-check-in', payload);
  }

  history(memberId: string): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`/api/member-attendance/history/${memberId}`).pipe(map(r => r.data));
  }

  overview(params: Record<string, string>): Observable<AttendanceOverviewPoint[]> {
    return this.http.get<{ data: AttendanceOverviewPoint[] }>('/api/member-attendance/overview', { params }).pipe(map(r => r.data));
  }

  byCellgroup(params: Record<string, string>): Observable<CellgroupBreakdownRow[]> {
    return this.http.get<{ data: CellgroupBreakdownRow[] }>('/api/member-attendance/by-cellgroup', { params }).pipe(map(r => r.data));
  }
}

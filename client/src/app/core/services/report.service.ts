import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface AttendanceReportRow { date: string; present: number; late: number; absent: number; excused: number; totalMembers: number; rate: number; }
export interface AttendanceReport {
  data: AttendanceReportRow[];
  summary: { totalMembers: number; services: number; avgRate: number; best: AttendanceReportRow | null; lowest: AttendanceReportRow | null };
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private http: HttpClient) {}

  attendance(params: Record<string, string>): Observable<AttendanceReport> {
    return this.http.get<AttendanceReport>('/api/reports/attendance', { params });
  }
  members(params: Record<string, string> = {}): Observable<any[]> {
    return this.http.get<{ data: any[] }>('/api/reports/members', { params }).pipe(map(r => r.data));
  }
  visitors(params: Record<string, string> = {}): Observable<any[]> {
    return this.http.get<{ data: any[] }>('/api/reports/visitors', { params }).pipe(map(r => r.data));
  }
}

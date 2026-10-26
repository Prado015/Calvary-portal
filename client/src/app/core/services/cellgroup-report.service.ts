import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MemberRecord } from './member.service';

export interface ActivityRecord {
  _id: string; date: string; type: string; attendeeCount: number; remarks: string;
  absentMembers: { _id: string; firstName: string; lastName: string }[];
}
export interface FundRecord {
  _id: string; year: number; month: number; amount: number; dateSubmitted: string; remarks: string;
}
export interface CellgroupReport {
  year: number;
  activityTypes: string[];
  cellgroup: { _id: string; name: string; department: { _id: string; name: string; slug: string }; leaderName: string; assistantLeaders: string[] };
  members: { male: MemberRecord[]; female: MemberRecord[]; unspecified: MemberRecord[] };
  activities: ActivityRecord[];
  funds: FundRecord[];
  summary: {
    roster: number; active: number; sundayGoer: number; inactive: number; otherChurch: number; needsFollowup: number;
    meetings: number; avgAttendance: number; fundTotal: number;
  };
}

@Injectable({ providedIn: 'root' })
export class CellgroupReportService {
  constructor(private http: HttpClient) {}

  get(cellgroupId: string, year: number): Observable<CellgroupReport> {
    return this.http.get<CellgroupReport>(`/api/cellgroup-reports/${cellgroupId}`, { params: { year: String(year) } });
  }

  addActivity(cellgroupId: string, payload: any): Observable<ActivityRecord> {
    return this.http.post<{ data: ActivityRecord }>(`/api/cellgroup-reports/${cellgroupId}/activities`, payload).pipe(map((r) => r.data));
  }
  updateActivity(id: string, payload: any): Observable<ActivityRecord> {
    return this.http.put<{ data: ActivityRecord }>(`/api/cellgroup-reports/activities/${id}`, payload).pipe(map((r) => r.data));
  }
  deleteActivity(id: string): Observable<void> {
    return this.http.delete<void>(`/api/cellgroup-reports/activities/${id}`);
  }

  saveFund(cellgroupId: string, payload: { year: number; month: number; amount: number | string | null; dateSubmitted: string; remarks: string }): Observable<unknown> {
    return this.http.put(`/api/cellgroup-reports/${cellgroupId}/funds`, payload);
  }

  updateLeaders(cellgroupId: string, payload: { leaderName: string; assistantLeaders: string[] }): Observable<unknown> {
    return this.http.put(`/api/cellgroups/${cellgroupId}`, payload);
  }
}

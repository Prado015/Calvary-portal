import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BoardType {
  _id: string; name: string; kind: 'weekly' | 'custom'; color: string;
  departments: { _id: string; name: string; slug: string }[];
}
export interface Occurrence {
  key: string; typeId: string; typeName: string; kind: 'weekly' | 'custom'; color: string; date: string;
  serviceId: string | null; department: { _id: string; name: string; slug: string } | null;
  departmentIds: string[]; // empty = applies to every member
}
export interface BoardMember {
  _id: string; memberId: string; firstName: string; lastName: string; status: string;
  department: { _id: string; name: string; slug: string } | null; cellgroup: { _id: string; name: string } | null;
}
export interface BoardMonth {
  year: number; month: number; today: string; truncated: boolean;
  department: { _id: string; name: string; slug: string } | null;
  types: BoardType[]; occurrences: Occurrence[]; members: BoardMember[];
  marks: Record<string, Record<string, string>>; // memberId -> occurrenceKey -> status
}
export interface MemberMonth {
  year: number; month: number; today: string;
  member: { _id: string; memberId: string; firstName: string; lastName: string; status: string; department: { _id: string; name: string } | null; cellgroup: { _id: string; name: string } | null };
  occurrences: Occurrence[]; marks: Record<string, string>; // occurrenceKey -> status
  summary: { held: number; present: number; rate: number; lastAttended: string | null };
}
export interface SaveColumn {
  typeId: string; date: string; serviceId?: string | null; marks: { member: string; status: string | null }[];
}

@Injectable({ providedIn: 'root' })
export class AttendanceBoardService {
  constructor(private http: HttpClient) {}

  month(params: Record<string, string>): Observable<BoardMonth> {
    return this.http.get<BoardMonth>('/api/attendance-board/month', { params });
  }
  memberMonth(id: string, year: number, month: number): Observable<MemberMonth> {
    return this.http.get<MemberMonth>(`/api/attendance-board/member/${id}`, { params: { year: String(year), month: String(month) } });
  }
  save(occurrences: SaveColumn[]): Observable<{ saved: number; cleared: number }> {
    return this.http.put<{ saved: number; cleared: number }>('/api/attendance-board/save', { occurrences });
  }
  addMeeting(payload: { typeId: string; date: string; departmentId?: string | null; repeatMonths?: number }): Observable<{ created: number; skipped: number; dates: string[] }> {
    return this.http.post<{ created: number; skipped: number; dates: string[] }>('/api/attendance-board/occurrences', payload);
  }
  deleteMeeting(serviceId: string): Observable<{ deletedMarks: number }> {
    return this.http.delete<{ deletedMarks: number }>(`/api/attendance-board/occurrences/${serviceId}`);
  }
}

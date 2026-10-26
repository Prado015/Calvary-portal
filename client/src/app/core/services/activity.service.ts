import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  constructor(private http: HttpClient) {}

  recent(params: Record<string, string> = {}): Observable<any[]> {
    return this.http.get<{ data: any[] }>('/api/dashboard/activity', { params }).pipe(map(r => r.data));
  }
}

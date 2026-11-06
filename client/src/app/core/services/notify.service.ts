import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface NotifyProviders { sms: boolean; email: boolean; }
export interface SendResult { memberId: string; name: string; status: 'sent' | 'failed' | 'skipped'; error: string; }
export interface SendResponse { counts: { sent: number; failed: number; skipped: number }; results: SendResult[]; }

@Injectable({ providedIn: 'root' })
export class NotifyService {
  constructor(private http: HttpClient) {}

  status(): Observable<NotifyProviders> {
    return this.http.get<{ data: NotifyProviders }>('/api/notify/status').pipe(map(r => r.data));
  }

  send(payload: { memberIds: string[]; channel: 'sms' | 'email'; message: string; subject?: string; kind?: string }): Observable<SendResponse> {
    return this.http.post<SendResponse & { success: boolean }>('/api/notify/send', payload);
  }
}

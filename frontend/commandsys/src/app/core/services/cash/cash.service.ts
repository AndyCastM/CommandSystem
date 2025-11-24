import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { API_URL } from '../constants';

export interface CashSession {
  id_cash_session: number;
  id_user: number;
  id_branch: number;
  opened_at: string;
  closed_at?: string | null;
  opening_amount: string | number | null;
  closing_amount?: string | number | null;
  notes?: string | null;
  is_closed: boolean;
}

@Injectable({ providedIn: 'root' })
export class CashService {
  private http = inject(HttpClient);
  private baseUrl = `${API_URL}/cash`;

  async getActiveSession(): Promise<CashSession | null> {
    return await lastValueFrom(
      this.http.post<CashSession | null>(`${this.baseUrl}/active`, {})
    );
  }

  async openSession(payload: { opening_amount: number; notes?: string }) {
    return await lastValueFrom(
      this.http.post<CashSession>(`${this.baseUrl}/open`, payload)
    );
  }

  async closeSession(payload: { counted_amount: number; notes?: string }) {
    return await lastValueFrom(
      this.http.post<CashSession>(`${this.baseUrl}/close`, payload)
    );
  }
}

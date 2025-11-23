import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../constants';

export interface MetricsResponse {
  total_sales: number;
  total_orders: number;
  avg_ticket: number;
  total_items: number;
  sales_over_time: { date: string; total: number }[];
  orders_over_time: { date: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private http = inject(HttpClient);
  private apiUrl = API_URL + '/metrics';

  getDashboard(from: string, to: string): Observable<MetricsResponse> {
    const params = new HttpParams().set('from', from).set('to', to);

    return this.http.get<MetricsResponse>(`${this.apiUrl}/dashboard`, {
      params,
    });
  }
}

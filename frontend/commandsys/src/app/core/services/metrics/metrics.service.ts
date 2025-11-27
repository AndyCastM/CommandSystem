import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../constants';

export interface MetricsResponse {
  // ===== MÉTRICAS BÁSICAS =====
  total_sales: number;
  total_orders: number;
  avg_ticket: number;
  total_items: number;

  sales_over_time: { date: string; total: number }[];
  orders_over_time: { date: string; count: number }[];

  // ===== MÉTRICAS AVANZADAS (gerente) =====
  avg_prep_time?: number;       // segundos promedio preparación
  avg_delivery_time?: number;   // segundos promedio entrega
  avg_total_time?: number;      // total = prep + delivery

  production_areas?: {
    area: string;
    items: number;
    prep_avg: number;
    delivery_avg: number;
  }[];

  slowest_products?: {
    product: string;
    avg_seconds: number;
    items: number;
  }[];

  fastest_products?: {
    product: string;
    avg_seconds: number;
    items: number;
  }[];
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

  getTopProducts(from: string, to: string) {
    return this.http.get<any[]>(`${this.apiUrl}/top-products`, {
      params: { from, to }
    });
  }

  exportPdf(from: string, to: string) {
    return this.http.get(`${this.apiUrl}/export/pdf`, {
      params: { from, to },
      responseType: 'blob' // importante para descargar archivos
    });
  }

  exportExcel(from: string, to: string) {
    return this.http.get(`${this.apiUrl}/export/excel`, {
      params: { from, to },
      responseType: 'blob'
    });
  }

}

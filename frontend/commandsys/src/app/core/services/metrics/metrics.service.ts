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

export interface CancellationLog {
  id_cancellation: number;
  cancelled_at: string;
  reason: string | null;
  user_name: string;
  quantity: number;
  product_name: string;
  id_order: number;
  order_folio: string | null;
  table_name: string | null;
  order_type: string | null;
}

export interface CancellationFilters {
  from: string;      // 'YYYY-MM-DD'
  to: string;        // 'YYYY-MM-DD'
  id_user?: string; 
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private http = inject(HttpClient);
  private apiUrl = API_URL + '/metrics';

  getDashboard(from: string, to: string, id_branch?: number | null): Observable<MetricsResponse> {
    let params = new HttpParams()
      .set('from', from)
      .set('to', to);

    // Si viene una sucursal específica, la mandamos
    if (id_branch !== null && id_branch !== undefined && id_branch !== 0) {
      params = params.set('id_branch', String(id_branch));
    }

    return this.http.get<MetricsResponse>(`${this.apiUrl}/dashboard`, { params });
  }

  getTopProducts(from: string, to: string, id_branch?: number | null) {
    const params: any = { from, to };

    if (id_branch !== null && id_branch !== undefined && id_branch !== 0) {
      params.id_branch = id_branch;
    }

    return this.http.get<any[]>(`${this.apiUrl}/top-products`, { params });
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

  getCancellations(filters: CancellationFilters): Observable<CancellationLog[]> {
    let params = new HttpParams()
      .set('from', filters.from)
      .set('to', filters.to);

    if (filters.id_user) {
      params = params.set('id_user', filters.id_user);
    }

    return this.http.get<CancellationLog[]>(
      `${this.apiUrl}/cancellations`,
      { params },
    );
  }
}

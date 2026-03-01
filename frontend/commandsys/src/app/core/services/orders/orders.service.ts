import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../constants';

export interface OrderItemOption {
  id_option_value: number;
}

export interface OrderItem {
  id_branch_product?: number;
  id_combo?: number;
  quantity: number;
  notes?: string;
  options?: OrderItemOption[];
  combo_groups?: {
    id_group: number;
    selected_options: { id_company_product: number }[];
  }[];
}

export interface CreateOrderPayload {
  order_type: 'dine_in' | 'takeout' ;
  id_session?: number | null;
  customer_name?: string | null;
  notes?:  string | null;
  items: OrderItem[];
}

// ========== TIPOS NUEVOS PARA SUMMARY ==========

export type OrderItemStatus =
  | 'pending'
  | 'in_preparation'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface SessionSummaryItem {
  id_order_item: number;
  id_order: number;
  status: OrderItemStatus;
  subtotal: number;
  created_at?: string | Date | null;
  product_name: string;
}

export interface SessionSummary {
  id_session: number;
  table: string;
  total: number;
  deliveredTotal: number;
  pendingCount: number;
  canRequestPrebill: boolean;
  items: SessionSummaryItem[];
}

export interface PrebillResponse {
  ok: boolean;
  total: number;
}

export interface ActiveOrderItem {
  id_order_item: number;
  status: OrderItemStatus;
  notes: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  group_number: number;
  branch_products: {
    company_products: {
      id_company_product: number;
      id_area: number;
      name: string;
    };
  } | null;
  order_item_options: {
    product_option_values: { name: string };
  }[];
}

export interface ActiveOrder {
  id_order: number;
  created_at: string;
  status: string;
  order_type: 'dine_in' | 'takeout';
  customer_name: string | null;
  total: number;
  table_sessions: {
    tables: { number: string };
  } | null;
  order_items: ActiveOrderItem[];
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private api_url = API_URL + '/orders';

  /**
   * Crear una orden
   */
  async createOrder(payload: CreateOrderPayload) {
    try {
      //console.log('Enviando orden al backend:', payload);

      const res = await firstValueFrom(
        this.http.post<any>(`${this.api_url}`, payload)
      );

      //console.log(' Orden creada:', res);
      return res;
    } catch (err: any) {
      console.error(' Error creando orden:', err);
      throw err?.error || err;
    }
  }

    // Obtener todas las comandas activas de la sucursal
  async getActiveOrdersByBranch() {
    try {
      return await firstValueFrom(
        this.http.get<any[]>(`${this.api_url}/branch/active`)
      );
    } catch (error) {
      console.error('Error obteniendo órdenes activas:', error);
      throw error;
    }
  }

  markDelivered(id_order_item: number) {
    return firstValueFrom(
        this.http.patch(`${this.api_url}/items/${id_order_item}/delivered`, {})
    );
  }

  cancelItem(id_order_item: number, reason: string, qty: number) {
    return firstValueFrom(
        this.http.patch(`${this.api_url}/items/${id_order_item}/cancel`, { reason })
    );
  }

  splitItem(id_order_item: number, qty: number) {
    return this.http.post(
      `${this.api_url}/item/${id_order_item}/split`,
      { qty },
      { withCredentials: true }
    );
  }

  cancelOrder(id_order: number, reason: string) {
    return firstValueFrom(
        this.http.patch(`${this.api_url}/${id_order}/cancel`, { reason })
    );
  }
  
  requestPrebill(id_session: number) {
    return firstValueFrom(
        this.http.post(`${this.api_url}/request-prebill/${id_session}`, {})
    );
  }

  requestTakeoutPrebill(id_order: number){
    return firstValueFrom(
        this.http.post(`${this.api_url}/takeout-prebill/${id_order}`, {})
    );
  } 

  getSessionSummary(id_session: number){
    return firstValueFrom(
      this.http.get<SessionSummary>(`${this.api_url}/summary/${id_session}`, {withCredentials: true}), 
    )
  }

  updateGroupStatus(
    id_order: number,
    group_number: number,
    status: OrderItemStatus,
    id_area?: number
  ) {

    const body: any = { status };

    if (id_area !== undefined) {
      body.id_area = id_area;
    }

    return firstValueFrom(
      this.http.patch(
        `${this.api_url}/${id_order}/groups/${group_number}/status/manual`,
        body
      )
    );
  }

  updateItemStatus(id_order_item: number, status: OrderItemStatus) {
    return firstValueFrom(
      this.http.patch(`${this.api_url}/items/${id_order_item}/status`, { status })
    );
  }
}

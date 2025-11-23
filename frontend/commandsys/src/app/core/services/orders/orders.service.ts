import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  items: OrderItem[];
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private API_URL = 'http://localhost:3000/api/orders';

  /**
   * Crear una orden
   */
  async createOrder(payload: CreateOrderPayload) {
    try {
      console.log('Enviando orden al backend:', payload);

      const res = await firstValueFrom(
        this.http.post<any>(`${this.API_URL}`, payload)
      );

      console.log(' Orden creada:', res);
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
        this.http.get<any[]>(`${this.API_URL}/branch/active`)
      );
    } catch (error) {
      console.error('Error obteniendo órdenes activas:', error);
      throw error;
    }
  }

  markDelivered(id_order_item: number) {
    return firstValueFrom(
        this.http.patch(`${this.API_URL}/items/${id_order_item}/delivered`, {})
    );
  }

  cancelItem(id_order_item: number, reason: string) {
    return firstValueFrom(
        this.http.patch(`${this.API_URL}/items/${id_order_item}/cancel`, { reason })
    );
  }

  cancelOrder(id_order: number, reason: string) {
    return firstValueFrom(
        this.http.patch(`${this.API_URL}/${id_order}/cancel`, { reason })
    );
  }
  
}

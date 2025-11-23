import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../shared/UI/toast.service';
import { OrderService } from '../../../core/services/orders/orders.service';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';
import { isPlatformBrowser } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { OrderDetailComponent } from '../UI/order-detail.component/order-detail.component';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, MatIconModule, MatDialogModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit{ 
  private toast = inject(ToastService);
  private ordersApi = inject(OrderService);
  private notif = inject(NotificationsService);
  private dialog = inject(MatDialog);

  loading = signal(false);
  viewMode = signal<'mesa' | 'producto'>('mesa');

  orders = signal<any[]>([]);
  readyProducts = signal<any[]>([]);
  preparingProducts = signal<any[]>([]);
  pendingProducts = signal<any[]>([]);

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async ngOnInit() {
    if (!this.isBrowser) return;  // ← evita 401 SSR
    await this.loadOrders();
    this.notif.onItemReady().subscribe((alert) => {
      if (alert) {
        // vuelve a cargar las comandas para actualizar estados
        this.loadOrders();
      }
    });

  }

  /** CARGA DESDE BACKEND */
 async loadOrders() {
  try {
    this.loading.set(true);

    const data = await this.ordersApi.getActiveOrdersByBranch();
    console.log('ORDENES RECIBIDAS --- ', data);

    const parsed = data.map(order => ({
      id: order.id_order,
      table:
        order.table_sessions?.tables?.number
          ? `Mesa ${order.table_sessions.tables.number}`
          : order.customer_name
          ? `Para llevar (${order.customer_name})`
          : 'Sin mesa',
      created: new Date(order.created_at).toLocaleTimeString(),
      time: this.timeSince(order.created_at),
      total: order.total,
      products: order.order_items.map((oi: { id_order_item: any; branch_products: { company_products: { name: any; base_price: any; }; }; quantity: any; subtotal: any; notes: any; status: string; order_item_options: any[]; }) => ({
        id_order_item: oi.id_order_item,
        name: oi.branch_products.company_products.name,
        qty: oi.quantity,
        base_price: Number(oi.branch_products.company_products.base_price),
        subtotal: oi.subtotal,
        notes: oi.notes,
        status: this.mapStatus(oi.status),
        options: oi.order_item_options.map(o => ({
          name: o.product_option_values.name,
          extra: Number(o.product_option_values.extra_price),
        }))
      }))
    }));

    this.orders.set(
      parsed.filter(order => order.products.some((p: any) => p.status !== 'entregado'))
    );

    this.splitByStatus();

  } catch (err) {
    console.error(err);
    this.toast.error('Error cargando comandas');
  } finally {
    this.loading.set(false);
  }
}


  /**  Mapea el status del backend a lo que usa la UI */
  mapStatus(s: string) {
    return {
      pending: 'pendiente',
      in_preparation: 'preparando',
      ready: 'listo',
      delivered: 'entregado',
      cancelled: 'cancelado',
    }[s] || 'pendiente';
  }

  /**  Calcula total */
  calculateTotal(order: any): number {
    let total = 0;
    for (const item of order.order_items) {
      const price = item.branch_products?.company_products?.base_price ?? 0;
      total += price * item.quantity;
    }
    return total;
  }

  /**  Minutos desde creación */
  timeSince(date: string) {
    const created = new Date(date);
    const diff = Math.floor((Date.now() - created.getTime()) / 60000);
    return diff + 'm';
  }

  /**  AGRUPA POR STATUS PARA TAB "Por Producto" */
  splitByStatus() {
    const ready: any[] = [];
    const preparing: any[] = [];
    const pending: any[] = [];

    this.orders().forEach(order => {
      order.products.forEach((p: any) => {
        const entry = { ...p, table: order.table };

        if (p.status === 'listo') ready.push(entry);
        else if (p.status === 'preparando') preparing.push(entry);
        else if (p.status === 'pendiente') pending.push(entry);
      });
    });

    this.readyProducts.set(ready);
    this.preparingProducts.set(preparing);
    this.pendingProducts.set(pending);
  }

  formatTotal(order: any) {
    return `$${order.total.toFixed(2)}`;
  }

  async markDelivered(p: any) {
    try {
      console.log('Marcando como entregado:', p);
      // marcar como entregado
      await this.ordersApi.markDelivered(p.id_order_item);

      //  Mensaje al mesero
      this.toast.success(`Producto ${p.name} marcado como entregado`);

      // Recargar órdenes para refrescar estados
      await this.loadOrders();

    } catch (err: any) {
      console.error(err);
      this.toast.error('Error al marcar como entregado');
    }
  }

  openOrderModal(order: any) {
    const dialogRef = this.dialog.open(OrderDetailComponent, {
      width: '480px',
      data: { order }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadOrders();
    });
  }

}

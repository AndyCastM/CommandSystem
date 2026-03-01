import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../shared/UI/toast.service';
import { OrderService } from '../../../core/services/orders/orders.service';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';
import { isPlatformBrowser } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { OrderDetailComponent } from '../UI/order-detail.component/order-detail.component';
import { OrdersEventsService } from '../../../core/services/orders/orders-event.service';

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
  private ordersEvents = inject(OrdersEventsService);

  loading = signal(false);
  viewMode = signal<'mesa' | 'producto'>('mesa');

  orders = signal<any[]>([]);
  readyProducts = signal<any[]>([]);
  preparingProducts = signal<any[]>([]);
  pendingProducts = signal<any[]>([]);

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async ngOnInit() {
    if (!this.isBrowser) return;  // evita 401 SSR
    
    await this.loadOrders();
    this.ordersEvents.refreshOrders$.subscribe(() => {
      console.log("Refrescando órdenes por evento global…");
      this.loadOrders();
    });

  }

  /** CARGA DESDE BACKEND */
  async loadOrders() {
    try {
      this.loading.set(true);

      const data = await this.ordersApi.getActiveOrdersByBranch();
      console.log('ORDENES RECIBIDAS --- ', data);

      const parsed = data.map(order => {

        // === CALCULAR TOTAL SIN CANCELADOS ===
        const total = order.order_items
          .filter((oi: any) => oi.status !== 'cancelled')
          .reduce((acc: number, oi: any) => {
            const base = Number(oi.branch_products.company_products.base_price);

            const optionsExtra = oi.order_item_options.reduce(
              (acc2: number, o: any) =>
                acc2 + Number(o.product_option_values.extra_price),
              0
            );

            return acc + (base + optionsExtra) * oi.quantity;
          }, 0);

        // Parsear la fecha que viene de la BD como hora local
        const dateStr = order.created_at.replace(' ', 'T'); // Convertir a formato ISO
        const orderDate = new Date(dateStr); // JavaScript lo interpreta como UTC
        const orderType = order.order_type;
        //console.log(orderType);
        // Ajustar a hora local agregando el offset
        const localDate = new Date(orderDate.getTime() + (orderDate.getTimezoneOffset() * 60000));

        return {
          id: order.id_order,

          table:
            order.table_sessions?.tables?.number
              ? `Mesa ${order.table_sessions.tables.number}`
              : order.customer_name
              ? `Para llevar (${order.customer_name})`
              : 'Sin mesa',

          created: localDate.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true 
          }),
          time: this.timeSince(localDate.toISOString()),
          type: orderType,
          total,
          payment_status: order.payment_status,

          // ================================
          //   ITEMS — CORREGIDO COMPLETO
          // ================================
          products: order.order_items.map((oi: any) => {
            // personalizaciones
            const options = oi.order_item_options.map((o: any) => ({
              name: o.product_option_values.name,
              extra: Number(o.product_option_values.extra_price),
            }));

            // precio base
            const base = Number(oi.branch_products.company_products.base_price);

            // extra por opciones
            const extra = options.reduce((acc: number, o: any) => acc + o.extra, 0);

            // subtotal por item
            const subtotal = (base + extra) * oi.quantity;

            return {
              id_order_item: oi.id_order_item,
              name: oi.branch_products.company_products.name,
              qty: oi.quantity,
              base_price: base,
              options,
              notes: oi.notes,
              subtotal,
              status: this.mapStatus(oi.status),
            };
          }),
        };
      });

      // Filtrar órdenes que tengan al menos 1 item activo
      console.log('ANTES DEL FILTRO', parsed);
      this.orders.set(
      parsed.filter(order => {
        const activeProducts = order.products.filter(
          (p: any) => p.status !== 'cancelado'
        );

        const allDelivered =
          activeProducts.length > 0 &&
          activeProducts.every((p: any) => p.status === 'entregado');
          const isPaid = order.payment_status === "paid";

          console.log({
          id: order.id,
          type: order.type,
          payment: order.payment_status,
        });
        // Desaparece SOLO si está todo entregado Y pagado
        return !(allDelivered && isPaid);
      })
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
      width: '90vw',        // 90% del viewport en móvil
      maxWidth: '480px',    // Máximo 480px en pantallas grandes
      data: { order }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadOrders();
    });
  }

  async requestPrebill(order: any) {
    //console.log("ID DE LA ORDEN:", order.id);

    if (!order?.id) {
      this.toast.error('No se pudo identificar la orden.');
      return;
    }

    try {
      // solicitamos la pre-cuenta
      await this.ordersApi.requestTakeoutPrebill(order.id);
      this.toast.success(`Se solicitó la cuenta de la orden #${order.id}`);
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo enviar la solicitud a caja.');
    }
  }

}

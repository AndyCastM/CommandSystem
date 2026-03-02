import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { OrderService, ActiveOrder, ActiveOrderItem, OrderItemStatus } from '../../core/services/orders/orders.service';
import { NotificationsService } from '../../core/services/notifications/notifications.service';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/services/auth.service';

export interface KanbanGroup {
  id_order: number;
  group_number: number;
  mesa: string;
  order_type: 'dine_in' | 'takeout';
  customer_name?: string;
  status: OrderItemStatus;
  items: {
    id_order_item: number;
    name: string;
    quantity: number;
    options: string[];
    notes: string | null;
    id_area: number;
  }[];
}

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './kitchen.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kitchen implements OnInit, OnDestroy {
  private ordersService = inject(OrderService);
  private notificationsService = inject(NotificationsService);
  private auth = inject(AuthService);
  private sub = new Subscription();

  orders = signal<ActiveOrder[]>([]);

  allGroups = computed<KanbanGroup[]>(() => {
    const groupsMap = new Map<string, KanbanGroup>();

    this.orders().forEach(order => {
      order.order_items
        .filter(item => item.branch_products && item.status !== 'cancelled')
        .forEach(item => {

          const key = `${order.id_order}-${item.group_number}`;

          if (!groupsMap.has(key)) {
            groupsMap.set(key, {
              id_order: order.id_order,
              group_number: item.group_number,
              mesa: order.table_sessions?.tables.number ?? 'Para llevar',
              order_type: order.order_type,
              customer_name: order.customer_name ?? undefined,
              status: item.status, // luego lo afinamos
              items: []
            });
          }

          const group = groupsMap.get(key)!;

          const name = item.branch_products!.company_products.name;
          const options = item.order_item_options.map(o => o.product_option_values.name);
          const notes = item.notes;

          const itemKey = `${name}-${options.join(',')}-${notes ?? ''}`;

          const existing = group.items.find(i =>
            `${i.name}-${i.options.join(',')}-${i.notes ?? ''}` === itemKey
          );

          if (existing) {
            existing.quantity += item.quantity;
          } else {
            group.items.push({
              id_order_item: item.id_order_item,
              name,
              quantity: item.quantity,
              options,
              notes,
              id_area: item.branch_products!.company_products.id_area
            });
          }

          if (item.status === 'pending') group.status = 'pending';
          else if (item.status === 'in_preparation' && group.status !== 'pending')
            group.status = 'in_preparation';
          else if (item.status === 'ready' && group.status === 'ready')
            group.status = 'ready';
        });
    });

    return Array.from(groupsMap.values());
  });

  pending = computed(() => this.allGroups().filter(g => g.status === 'pending'));
  in_preparation = computed(() => this.allGroups().filter(g => g.status === 'in_preparation'));
  ready = computed(() => this.allGroups().filter(g => g.status === 'ready'));

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async ngOnInit() {
    
    if (!this.isBrowser) return;

    this.notificationsService.connect();

    // Carga inicial
    this.ordersService.getActiveOrdersByBranch().then(orders => {
      this.orders.set(orders);
    });
    console.log(this.orders);
    // Escuchar eventos del socket
    this.sub.add(
      this.notificationsService.events$.subscribe(event => {
        if (!event) return;

        if (event.type === 'order:new') {
          this.ordersService.getActiveOrdersByBranch().then(orders => {
            this.orders.set(orders);
          });
        }

        if (event.type === 'order_item:status') {
          const { id_order_item, status } = event.data as { id_order_item: number; status: OrderItemStatus };
          this.orders.update(prev =>
            prev.map(order => ({
              ...order,
              order_items: order.order_items.map(item =>
                item.id_order_item === id_order_item ? { ...item, status } : item
              )
            }))
          );
        }
        if (event.type === 'order:item-cancelled') {
          const { id_order_item } = event.data;

          this.orders.update(prev =>
            prev.map(order => ({
              ...order,
              order_items: order.order_items.map(item =>
                item.id_order_item === id_order_item
                  ? { ...item, status: 'cancelled' }
                  : item
              )
            }))
          );
        }

      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  changeGroupStatus(group: KanbanGroup, status: OrderItemStatus) {

    // Actualización local inmediata (optimistic update)
    this.orders.update(prev =>
      prev.map(order => {
        if (order.id_order !== group.id_order) return order;

        return {
          ...order,
          order_items: order.order_items.map(item =>
            item.group_number === group.group_number && item.status !== 'cancelled'
              ? { ...item, status }
              : item
          )
        };
      })
    );

    // Avisar al backend 
    this.ordersService.updateGroupStatus(
      group.id_order,
      group.group_number,
      status
    );
  }

  onLogout() {
    this.auth.logout()    
  }
}
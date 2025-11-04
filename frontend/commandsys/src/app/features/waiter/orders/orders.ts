import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../shared/UI/toast.service';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, MatIconModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit{ 
  private toast = inject(ToastService);

  loading = signal(false);
  viewMode = signal<'mesa' | 'producto'>('mesa');

  orders = signal<any[]>([]);
  readyProducts = signal<any[]>([]);
  preparingProducts = signal<any[]>([]);
  pendingProducts = signal<any[]>([]);

  ngOnInit() {
    this.loadOrders();
  }

  async loadOrders() {
    this.loading.set(true);
    // 🔹 Aquí luego harás la llamada real al backend (por mesero)
    setTimeout(() => {
      const mockOrders = [
        {
          id: 1,
          table: 'Mesa 8',
          total: 360,
          time: '15m',
          created: '7:54 p.m.',
          products: [
            { name: 'Taco de Asada - Harina', qty: 2, price: 60, status: 'preparando' },
            { name: 'Papa Asada', qty: 1, price: 120, status: 'listo' },
            { name: 'Coca-Cola Zero', qty: 4, price: 30, status: 'listo' },
          ],
        },
        {
          id: 2,
          table: 'Mesa 5',
          total: 360,
          time: '10m',
          created: '7:54 p.m.',
          products: [
            { name: 'Taco de Asada - Harina', qty: 2, price: 60, status: 'preparando' },
            { name: 'Papa Asada', qty: 1, price: 120, status: 'pendiente' },
            { name: 'Coca-Cola Zero', qty: 4, price: 30, status: 'listo' },
          ],
        },
        {
          id: 3,
          table: 'Mesa 3',
          total: 420,
          time: '15m',
          created: '7:54 p.m.',
          products: [
            { name: 'Papa Asada', qty: 1, price: 120, status: 'entregado' },
            { name: 'Coca-Cola Zero', qty: 4, price: 30, status: 'entregado' },
          ],
        },
      ];

      this.orders.set(mockOrders);
      this.splitByStatus();
      this.loading.set(false);
    }, 400);
  }

  splitByStatus() {
    const ready: any[] = [];
    const preparing: any[] = [];
    const pending: any[] = [];

    this.orders().forEach((order) => {
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

  markDelivered(p: any) {
    this.toast.success(`Producto ${p.name} entregado`);
  }

  formatTotal(order: any) {
    return `$${order.total.toFixed(2)}`;
  }
}

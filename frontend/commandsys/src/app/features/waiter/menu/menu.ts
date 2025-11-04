import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuResponse, MenuService } from '../../../core/services/menu/menu.service';
import { ToastService } from '../../../shared/UI/toast.service';

@Component({
  selector: 'app-waiter-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css'],
})
export class Menu implements OnInit {
  private api = inject(MenuService);
  private toast = inject(ToastService);

  loading = signal(true);
  menu = signal<{ category: string; products: any[] }[]>([]);

  async ngOnInit() {
    try {
      const response: MenuResponse = await this.api.getBranchMenu();

      //  Asegura que el formato sea un arreglo de { category, products }
      if (Array.isArray(response)) {
        this.menu.set(response);
      } else if (response?.data) {
        this.menu.set(response.data);
      } else {
        this.menu.set([]);
      }

      console.log('Menú cargado:', this.menu());
    } catch (err) {
      console.error(err);
      this.toast.error('Error al cargar el menú');
    } finally {
      this.loading.set(false);
    }
  }

  formatPrice(price: number) {
    return `$${price.toFixed(2)}`;
  }
}

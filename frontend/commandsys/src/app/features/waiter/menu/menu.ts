import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/UI/toast.service';
import { MenuService } from '../../../core/services/menu/menu.service';
import { MatDialog } from '@angular/material/dialog';
import { ProductDetailDialogComponent } from '../../../shared/modals/product-detail-dialog.component/product-detail-dialog.component';
import { OrderPreviewComponent } from '../order-preview/app-order-preview.component';
import { MatOption, MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, OrderPreviewComponent, MatSelect, MatOption],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css'],
})
export class Menu implements OnInit {

  private router = inject(Router);
  private toast = inject(ToastService);
  private menuApi = inject(MenuService);
  private dialog = inject(MatDialog);

  menu = signal<any[]>([]);
  loading = signal(false);

  id_session: number | null = null;
  orderType!: 'dine_in' | 'takeout';

  // para siempre agregar productos:
  isAdding: boolean = true;

  cart = signal<Map<number, any>>(new Map());
  selectedArea: any = {};
  drawerOpen = false;

  ngOnInit() {
    const state = history.state;

    if (state) {
      this.id_session = state.id_session ?? null;
      this.orderType = state.type ?? 'takeout';
    }

    console.log('Menu loaded with:', {
      idSession: this.id_session,
      orderType: this.orderType,
    });

    this.loadMenu();
  }

  async loadMenu() {
    this.loading.set(true);
    try {
      const res = await this.menuApi.getBranchMenu();
      this.menu.set(res.data);
    } catch (err) {
      console.error(err);
      this.toast.error('Error al cargar el menú');
    } finally {
      this.loading.set(false);
    }
  }

  selectArea(area: any) {
    this.selectedArea = area;
  }

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
  }

  formatPrice(value: number): string {
    return '$' + Number(value).toFixed(2);
  }

  goBack() {
    this.router.navigate(['/mesero/mesas']);
  }

  onImageError(e: Event) {
    (e.target as HTMLImageElement).src =
      'https://placehold.co/400x300?text=Imagen+no+disponible';
  }

  openProductDetail(id_company_product: number) {
    const dialogRef = this.dialog.open(ProductDetailDialogComponent, {
      width: '400px',
      data: { id_company_product, isAdding: this.isAdding },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.addProductToCart(result);
    });
  }

  addProductToCart(productData: any) {
    const existing = this.cart().get(productData.product.id_branch_product);

    if (existing) {
      existing.quantity += productData.quantity;
    } else {
      this.cart().set(productData.product.id_branch_product, {
        product: productData.product,
        quantity: productData.quantity,
        options: productData.options,
        notes: productData.notes,
      });
    }

    this.cart.set(new Map(this.cart()));
  }

  removeFromCart(id_branch_product: number) {
    this.cart().delete(id_branch_product);
    this.cart.set(new Map(this.cart()));
  }

  updateQuantity(id_branch_product: number, delta: number) {
    const item = this.cart().get(id_branch_product);
    if (!item) return;

    item.quantity = Math.max(1, item.quantity + delta);
    this.cart.set(new Map(this.cart()));
  }

  totalAmount(): number {
    let total = 0;

    for (const item of this.cart().values()) {
      const base = item.product.base_price;
      let extras = 0;

      for (const opt of item.options || []) {
        const optTotal = opt.values?.reduce(
          (acc: number, v: any) => acc + (v.extra_price || 0),
          0
        );
        extras += optTotal || 0;

        const optionDetail = item.product.options.find(
          (pOpt: any) => pOpt.id_option === opt.id_option
        );

        if (optionDetail?.tiers?.length > 0) {
          const selectedCount = opt.values?.length || 0;
          const tier = optionDetail.tiers.find(
            (t: any) => selectedCount === t.selection_count
          );
          if (tier) extras += tier.extra_price;
        }
      }

      const subtotal = (base + extras) * item.quantity;
      total += subtotal;
    }

    return total;
  }

  confirmOrder() {
    if (this.cart().size === 0) return;

    console.log('Enviando orden con: ', {
      id_session: this.id_session,
      order_type: this.orderType,
      items: Array.from(this.cart().values()),
    });

    // Llamada al backend aquí
  }
}

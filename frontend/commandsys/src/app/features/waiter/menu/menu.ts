import { Component, OnInit, inject, signal , PLATFORM_ID} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/UI/toast.service';
import { MenuService } from '../../../core/services/menu/menu.service';
import { MatDialog } from '@angular/material/dialog';
import { ProductDetailDialogComponent } from '../../../shared/modals/product-detail-dialog.component/product-detail-dialog.component';
import { OrderPreviewComponent } from '../order-preview/app-order-preview.component';
import { MatOption, MatSelect } from '@angular/material/select';
import { OrderConfirmModal, OrderConfirmResult } from '../UI/order-confirm/order-confirm.modal';
import { OrderService, CreateOrderPayload } from '../../../core/services/orders/orders.service';
import { isPlatformBrowser } from '@angular/common';

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
  private orderApi = inject(OrderService);
  private dialog = inject(MatDialog);

  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  menu = signal<any[]>([]);
  loading = signal(false);

  id_session: number | null = null;
  orderType: 'dine_in' | 'takeout' | null = null;
  isDineInLocked = false;

  // para siempre agregar productos:
  isAdding: boolean = true;

  cart = signal<Map<string, any>>(new Map());
  selectedArea: any = {};
  drawerOpen = false;

  ngOnInit() {
    let state: any = null;

    //  Solo tocar `history` cuando estás en navegador
    if (isPlatformBrowser(this.platformId)) {
      state = history.state;
    }

    // 1) CONSULTA — si no viene nada en el state
    if (!state?.id_session && !state?.type && !state?.mode) {
      this.isAdding = false;
      this.id_session = null;
      this.orderType = null;
      this.isDineInLocked = false;
    }

    // 2) CONSULTA explícita
    else if (state?.mode === 'view') {
      this.isAdding = false;
      this.id_session = null;
      this.orderType = null;
      this.isDineInLocked = false;
    }

    // 3) DINE-IN
    else if (state?.id_session) {
      this.isAdding = true;
      this.id_session = state.id_session;
      this.orderType = 'dine_in';
      this.isDineInLocked = true;
    }

    // 4) TAKEOUT
    else if (state?.type) {
      this.isAdding = true;
      this.id_session = null;
      this.orderType = state.type;
      this.isDineInLocked = false;
    }

    console.log('Menu loaded with:', {
      isAdding: this.isAdding,
      idSession: this.id_session,
      orderType: this.orderType,
      isDineInLocked: this.isDineInLocked
    });

    if (!this.isBrowser) return;  // ← evita 401 SSR
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

  onOrderTypeChange(type: 'dine_in' | 'takeout' ) {
    console.log("Cambio detectado:", type);
    console.log("isDineInLocked:", this.isDineInLocked);

    if (this.isDineInLocked) {
      return; //  no permitir cambiar tipo en dine_in
    }

    this.orderType = type;

    // takeout/delivery activan modo agregar
    if (type === 'takeout') {
      this.isAdding = true;
      this.id_session = null;
    }

    // volver a dine_in sin sesión = consulta
    if (type === 'dine_in' && !this.id_session) {
      this.isAdding = false;
    }
    console.log("Tipo cambiado:", this.orderType, "Modo agregar:", this.isAdding);
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

  generateCartKey(product: any, options: any[], notes: string): string {
    const baseId = product.id_branch_product;
    const opt = JSON.stringify(options || []);
    const note = notes || '';
    return `${baseId}--${opt}--${note}`;
  }

  addProductToCart(productData: any) {
    const key = this.generateCartKey(
      productData.product,
      productData.options,
      productData.notes
    );

    const cartMap = this.cart(); // Map actual

    const existing = cartMap.get(key);

    if (existing) {
      existing.quantity += productData.quantity;
    } else {
      cartMap.set(key, {
        product: productData.product,
        quantity: productData.quantity,
        options: productData.options,
        notes: productData.notes,
      });
    }

    // actualizar señal
    this.cart.set(new Map(cartMap));
  }

  removeFromCart(key: string) {
    this.cart().delete(key);
    this.cart.set(new Map(this.cart()));
  }

  updateQuantity(key: string, delta: number) {
    const item = this.cart().get(key);
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

  async confirmOrder() {
    if (this.cart().size === 0) {
      this.toast.info('No hay productos en la comanda');
      return;
    }

    if (!this.orderType) {
      this.toast.error('Seleccione el tipo de orden');
      return;
    }

    // Abre el modal usando tu función ya creada
    this.openConfirmModal().subscribe(async (result: OrderConfirmResult | null) => {
      if (!result) return; // Cancelado

      try {
        // --- MAPEO COMPLETO DE ITEMS ---
        const items = Array.from(this.cart().values()).map((item: any) => {
          
          // opciones normales
          const optionValues =
            (item.options || [])
              .flatMap((opt: any) => opt.values || [])
              .map((v: any) => ({
                id_option_value: v.id_option_value,
              })) || [];

          // combos si existen
          const comboGroups =
            item.combo_groups?.map((cg: any) => ({
              id_combo_group: cg.id_combo_group,
              selected_options: cg.selected_options.map((sel: any) => ({
                id_company_product: sel.id_company_product,
                name: sel.name,
                extra_price: sel.extra_price,
              })),
            })) ?? [];

          return {
            id_branch_product: item.product.id_branch_product ?? null,
            id_combo: item.product.id_combo ?? null,
            quantity: item.quantity,
            notes: item.notes ?? null,
            options: optionValues,
            combo_groups: comboGroups,
          };
        });

        // --- PAYLOAD FINAL ---
        const payload: CreateOrderPayload = {
          order_type: this.orderType!,
          id_session: this.orderType === 'dine_in' ? this.id_session : null,
          customer_name: this.orderType === 'takeout' ? result.customer_name : null,
          items,
        };

        console.log('PAYLOAD FINAL --- ', payload);

        const res = await this.orderApi.createOrder(payload);

        this.toast.success(res?.message || 'Comanda creada correctamente');

        // limpiar todo
        this.cart.set(new Map());
        this.router.navigate(['/mesero/mesas']);

      } catch (err: any) {
        console.error(err);

        const msg =
          err?.error?.message ||
          err?.message ||
          'Error al crear la comanda';

        this.toast.error(msg);
      }
    });
  }

  openConfirmModal() {
    const dialogRef = this.dialog.open(OrderConfirmModal, {
      width: '420px',
      disableClose: true,
      data: {
        orderType: this.orderType,
        kitchenPreview: Array.from(this.cart().values()).map((item: any) => ({
          name: item.product.name,
          qty: item.quantity,
          notes: item.notes,
          options: (item.options || []).map((o: any) =>
            (o.values || []).map((v: any) => v.name).join(', ')
          ),
        })),
      },
    });

    return dialogRef.afterClosed();
  }

}

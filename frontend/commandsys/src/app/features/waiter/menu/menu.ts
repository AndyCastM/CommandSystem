import { Component, OnInit, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect, MatOption } from '@angular/material/select';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { ToastService } from '../../../shared/UI/toast.service';
import { MenuService } from '../../../core/services/menu/menu.service';
import { OrderService, CreateOrderPayload } from '../../../core/services/orders/orders.service';
import { ProductDetailDialogComponent } from '../../../shared/modals/product-detail-dialog.component/product-detail-dialog.component';
import { OrderConfirmModal, OrderConfirmResult } from '../UI/order-confirm/order-confirm.modal';

import { OrderPreviewComponent } from '../order-preview/app-order-preview.component';
import { OrderPreviewMovilComponent } from '../order-preview-movil/order-preview-movil.component';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSelect,
    MatOption,
    OrderPreviewComponent,
    OrderPreviewMovilComponent,
  ],
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

  isBrowser = isPlatformBrowser(this.platformId);

  menu = signal<any[]>([]);
  loading = signal(false);

  id_session: number | null = null;
  orderType: 'dine_in' | 'takeout' | null = null;
  isDineInLocked = false;
  isAdding: boolean = true;

  // ======== GRUPOS ========
  groups = signal<number[]>([1]);
  currentGroup = signal(1);

  get groupKeys(): number[] {
    return this.groups();
  }

  get grouped(): { [group: number]: { key: string; value: any }[] } {
    const result: { [group: number]: { key: string; value: any }[] } = {};

    // inicializar
    for (const g of this.groupKeys) {
      result[g] = [];
    }

    for (const [key, value] of this.cart().entries()) {
      const g = value.group_number || 1;
      if (!result[g]) result[g] = [];
      result[g].push({ key, value });
    }

    return result;
  }

  addGroup() {
    const current = this.groups();
    const next = Math.max(...current) + 1;
    this.groups.set([...current, next]);
    this.currentGroup.set(next);
  }

  // ======== CARRITO ========
  cart = signal<Map<string, any>>(new Map());
  selectedArea: any = {};
  drawerOpen = false;

  @ViewChild(OrderPreviewMovilComponent) orderPreviewMovil?: OrderPreviewMovilComponent;
  @ViewChild(OrderPreviewComponent) orderPreviewDesktop?: OrderPreviewComponent;

  ngOnInit() {
    let state: any = null;

    if (isPlatformBrowser(this.platformId)) {
      state = history.state;
    }

    // 1) Consulta simple (sin sesión ni tipo)
    if (!state?.id_session && !state?.type && !state?.mode) {
      this.isAdding = false;
      this.id_session = null;
      this.orderType = null;
      this.isDineInLocked = false;
    }
    // 2) Modo vista
    else if (state?.mode === 'view') {
      this.isAdding = false;
      this.id_session = null;
      this.orderType = null;
      this.isDineInLocked = false;
    }
    // 3) Dine-in
    else if (state?.id_session) {
      this.isAdding = true;
      this.id_session = state.id_session;
      this.orderType = 'dine_in';
      this.isDineInLocked = true;
    }
    // 4) Takeout
    else if (state?.type) {
      this.isAdding = true;
      this.id_session = null;
      this.orderType = state.type;
      this.isDineInLocked = false;
    }

    if (!this.isBrowser) return;
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

  onOrderTypeChange(type: 'dine_in' | 'takeout') {
    if (this.isDineInLocked) return;

    this.orderType = type;

    if (type === 'takeout') {
      this.isAdding = true;
      this.id_session = null;
    }

    if (type === 'dine_in' && !this.id_session) {
      this.isAdding = false;
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

  generateCartKey(product: any, options: any[], notes: string, groupNumber: number): string {
    const baseId = product.id_branch_product;
    const opt = JSON.stringify(options || []);
    const note = notes || '';
    return `${baseId}--${opt}--${note}--group:${groupNumber}`;
  }

  addProductToCart(productData: any) {
    const key = this.generateCartKey(
      productData.product,
      productData.options,
      productData.notes,
       this.currentGroup(),
    );

    const cartMap = this.cart();
    const existing = cartMap.get(key);

    if (existing) {
      existing.quantity += productData.quantity;
    } else {
      cartMap.set(key, {
        product: productData.product,
        quantity: productData.quantity,
        options: productData.options,
        notes: productData.notes,
        group_number: this.currentGroup(), // aquí marcamos el grupo
      });
    }

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
      const base = Number(item.product?.base_price || 0);
      let extraValuesPrice = 0;
      let tiersPrice = 0;

      // 1. Calcular la suma de TODOS los valores individuales seleccionados
      // (Igual que el primer bucle de tu backend)
      for (const opt of item.options || []) {
        extraValuesPrice += (opt.values || []).reduce(
          (acc: number, v: any) => acc + Number(v.extra_price || 0),
          0
        );
      }

      // 2. Calcular los TIERS (Igual que el segundo bucle de tu backend)
      // Se SUMAN al total, no reemplazan a los valores.
      for (const opt of item.options || []) {
        const count = (opt.values || []).length;
        
        if (opt.multi_select && opt.tiers && opt.tiers.length > 0) {
          const matchingTier = opt.tiers.find((t: any) => Number(t.selection_count) === count);
          if (matchingTier) {
            tiersPrice += Number(matchingTier.extra_price || 0);
          }
        }
      }

      // El subtotal es (Base + Extras + Tiers) * Cantidad
      const subtotal = (base + extraValuesPrice + tiersPrice) * Number(item.quantity || 1);
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

    this.openConfirmModal().subscribe(async (result: OrderConfirmResult | null) => {
      if (!result) return;

      try {
        const items = Array.from(this.cart().values()).map((item: any) => {
          const optionValues =
            (item.options || [])
              .flatMap((opt: any) => opt.values || [])
              .map((v: any) => ({
                id_option_value: v.id_option_value,
              })) || [];

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
            group_number: item.group_number || 1, //  se envía al backend
          };
        });

        const generalNotes =
          this.orderPreviewMovil?.generalNotes ||
          this.orderPreviewDesktop?.generalNotes ||
          null;

        const payload: CreateOrderPayload = {
          order_type: this.orderType!,
          id_session: this.orderType === 'dine_in' ? this.id_session : null,
          notes: generalNotes,
          customer_name: this.orderType === 'takeout' ? result.customer_name : null,
          items,
        };

        //console.log('PAYLOAD FINAL --- ', payload);

        const res = await this.orderApi.createOrder(payload);
        this.toast.success(res?.message || 'Comanda creada correctamente');

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

  removeEmptyGroup(group: number) {
    // evita borrar grupo 1
    if (group === 1) return;

    // verifica si ese grupo tiene items en el cart
    const hasItems = Array.from(this.cart().values()).some(
      (item: any) => item.group_number === group
    );

    // si tiene items, no se elimina
    if (hasItems) return;

    // eliminar del array
    const updated = this.groups().filter(g => g !== group);
    this.groups.set(updated);

    // si el grupo que se eliminó era el seleccionado, movernos al último válido
    if (this.currentGroup() === group) {
      const last = updated[updated.length - 1] || 1;
      this.currentGroup.set(last);
    }
  }

  cartHasGroup(g: number): boolean {
    return Array.from(this.cart().values()).some(
      (item: any) => item.group_number === g
    );
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

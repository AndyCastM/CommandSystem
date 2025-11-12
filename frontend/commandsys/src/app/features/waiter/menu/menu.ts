import { Component, OnInit, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../shared/UI/toast.service';
import { MenuService } from '../../../core/services/menu/menu.service';
import { MatDialog } from '@angular/material/dialog';
import { ProductDetailDialogComponent } from '../../../shared/modals/product-detail-dialog.component/product-detail-dialog.component';
import { OrderPreviewComponent } from '../order-preview/app-order-preview.component';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, OrderPreviewComponent],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css'],
})
export class Menu implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private menuApi = inject(MenuService);
  private dialog = inject(MatDialog);

  menu = signal<any[]>([]);
  loading = signal(false);
  idTable?: number;
  isAdding: boolean = false;  // Para saber si estamos en modo de agregar o solo ver

  // Carrito de productos
  cart = signal<Map<number, any>>(new Map()); // Mapa de productos agregados

  selectedArea: any = {};  // Área seleccionada para mostrar sus productos

  drawerOpen = false; // false = cerrado, true = abierto

  selectArea(area: any) {
    this.selectedArea = area;  // Seteamos el área seleccionada
  }

  ngOnInit() {
    // Leer el parámetro isAdding desde la ruta (pasado en las rutas)
    this.isAdding = this.route.snapshot.data['isAdding'];

    // Leer el id de la mesa si lo tiene
    this.idTable = Number(this.route.snapshot.paramMap.get('id_table'));
    this.loadMenu();
  }

  async loadMenu() {
    this.loading.set(true);
    try {
      const res = await this.menuApi.getBranchMenu();
      console.log('Menú cargado:', res.data);
      this.menu.set(res.data);  // Fuerza render con nueva referencia
    } catch (err) {
      console.error('Error al cargar menú:', err);
      this.toast.error('Error al cargar el menú');
    } finally {
      this.loading.set(false);
    }
  }

  // toggle para abrir/cerrar el drawer en móvil
  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
  }

  formatPrice(value: number): string {
    return '$' + Number(value).toFixed(2);
  }

  goBack() {
    this.router.navigate(['/mesero/mesas']);
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src =
      'https://placehold.co/400x300?text=Imagen+no+disponible';
  }

  openProductDetail(id_company_product: number, isAdding: boolean) {
    //console.log('Producto seleccionado: ', id_company_product, 'isAdding:', isAdding);
    const dialogRef = this.dialog.open(ProductDetailDialogComponent, {
      width: '400px',
      data: { id_company_product, isAdding },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addProductToCart(result);
        console.log('Producto agregado al carrito:', result);
      }
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

    this.cart.set(new Map(this.cart())); // refresca el signal
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

      // Sumar los precios extra de las opciones seleccionadas
      for (const opt of item.options || []) {
        const optTotal = opt.values?.reduce(
          (acc: number, v: any) => acc + (v.extra_price || 0),
          0
        );
        extras += optTotal || 0;

        // Buscar si esta opción tiene tiers y aplica un precio adicional
        const optionDetail = item.product.options.find(
          (pOpt: any) => pOpt.id_option === opt.id_option
        );

        if (optionDetail?.tiers?.length > 0) {
          const selectedCount = opt.values?.length || 0;
          // Buscar el tier aplicable
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
    console.log('Confirmando comanda:', Array.from(this.cart().values()));
    // aquí puedes llamar al backend
  }
}

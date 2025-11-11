import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../shared/UI/toast.service';
import { MenuService } from '../../../core/services/menu/menu.service';
import { MatDialog } from '@angular/material/dialog';
import { ProductDetailDialogComponent } from '../../../shared/modals/product-detail-dialog.component/product-detail-dialog.component';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [CommonModule, MatIconModule],
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

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Producto agregado:', result);
        // Aquí puedes enviar el producto al carrito o al pedido actual
      }
    });
  }

  // Agregar producto al carrito
  addToCart(product: any) {
    const { product: selectedProduct, options, quantity } = product;

    // Verificar si el producto ya existe en el carrito
    const currentProduct = this.cart().get(selectedProduct.id_company_product);

    if (currentProduct) {
      currentProduct.quantity += quantity;  // Si existe, aumentar la cantidad
    } else {
      // Si no existe, agregarlo al carrito
      this.cart().set(selectedProduct.id_company_product, {
        ...selectedProduct,
        options,
        quantity,
      });
    }

    // Actualizar el carrito
    this.cart.set(new Map(this.cart()));
  }

  // Eliminar producto del carrito
  removeFromCart(productId: number) {
    this.cart().delete(productId);
    this.cart.set(new Map(this.cart())); // Actualizamos el carrito
  }

  // Método para agregar el producto al carrito o al pedido
  addToOrder(product: any) {
    if (!this.isAdding) {
      this.toast.error('No puedes agregar productos, solo estás viendo el menú.');
      return;
    }

    // Validar que la comanda esté asociada a una mesa activa o a domicilio
    if (!this.idTable) {
      this.toast.error('Este pedido no está asociado a ninguna mesa activa o domicilio.');
      return;
    }

    console.log('Producto agregado:', product);
    // Lógica para agregar el producto al carrito o al pedido actual
  }

  // Confirmar productos y crear la comanda
  confirmOrder() {
    if (this.cart().size === 0) {
      this.toast.error('No has seleccionado productos para la comanda.');
      return;
    }

    console.log('Comanda confirmada con los siguientes productos:', Array.from(this.cart().values()));
    // Aquí llamamos al servicio que manejaría la creación de la comanda en el backend
  }
}

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
  idBranch?: number;

  ngOnInit() {
    this.idTable = Number(this.route.snapshot.paramMap.get('id_table'));
    this.loadMenu();
  }

  async loadMenu() {
    this.loading.set(true);
    try {
      const res = await this.menuApi.getBranchMenu();
      console.log(' Menú cargado:', res.data);
      this.menu.set([...res.data]); // fuerza render con nueva referencia
    } catch (err) {
      console.error(' Error al cargar menú:', err);
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

  openProductDetail(id_company_product: number) {
    console.log('Producto seleccionado: ', id_company_product);
    const dialogRef = this.dialog.open(ProductDetailDialogComponent, {
      width: '400px',
      data: { id_company_product },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Producto agregado:', result);
        // Aquí puedes enviar el producto al carrito o al pedido actual
      }
    });
  }

}

import { Component, computed, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ProductService } from '../data-access/products.service';
import { ProductDialogComponent } from '../UI/product-dialog/product-dialog.component'; // <-- corrige ruta
import type { Product } from '../data-access/products.models';

type Category = 'Cocina' | 'Bebidas' | 'Postres' | 'Otros';

@Component({
  standalone: true,
  selector: 'app-products-admin',
  imports: [CommonModule, FormsModule, RouterModule, NgOptimizedImage, MatDialogModule],
  templateUrl: './products-admin.component.html',
})
export class ProductsAdminComponent {
  // UI state
  search = signal('');
  selectedCategory = signal<'Todas' | Category>('Todas');

  // Data
  productsSig: typeof this.productSrv.productsSig;
  categories = signal<Category[]>(['Cocina', 'Bebidas']);

  constructor(private productSrv: ProductService, private dialog: MatDialog) {
    this.productsSig = this.productSrv.productsSig; // signal<Product[]>
  }

  // Derived
  filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const cat = this.selectedCategory();

    return this.productsSig()
      .filter(p => (cat === 'Todas' ? true : p.category === cat))
      .filter(p =>
        !term
          ? true
          : p.name.toLowerCase().includes(term) ||
            (p.description ?? '').toLowerCase().includes(term)
      );
  });

  // Cards: métricas por categoría
  metrics = computed(() => {
    const map = new Map<Category, { total: number; disponibles: number }>();
    for (const c of this.categories()) map.set(c, { total: 0, disponibles: 0 });
    for (const p of this.productsSig()) {
      if (!map.has(p.category)) map.set(p.category, { total: 0, disponibles: 0 });
      const m = map.get(p.category)!;
      m.total += 1;
      if (p.available) m.disponibles += 1;
    }
    return map;
  });

  // Dialog: crear
  openCreate() {
    this.dialog
      .open(ProductDialogComponent, {
        data: { mode: 'create', id_company: 5, id_branch: 12 },
        panelClass: 'rounded-2xl',
      })
      .afterClosed()
      .subscribe((res: Product | null) => {
        if (res) {
          // this.productSrv.create(res); // conecta al servicio
        }
      });
  }

  // Dialog: editar
  openEdit(p: Product) {
    this.dialog
      .open(ProductDialogComponent, {
        data: { mode: 'edit', value: p, id_company: 5, id_branch: 12 },
        panelClass: 'rounded-2xl',
      })
      .afterClosed()
      .subscribe((res: Product | null) => {
        if (res) {
          // si tu Product tiene id_product, ajusta aquí
          // this.productSrv.update(p.id, res);
        }
      });
  }

  // Actions
  // toggleAvailability(p: Product) {
  //   this.productSrv.update(p.id, { available: !p.available });
  // }

  // delete(p: Product) {
  //   if (confirm(`Eliminar "${p.name}"?`)) this.productSrv.remove(p.id);
  // }

  trackById(index: number, item: Product) {
    return item?.id_product;
  }
}

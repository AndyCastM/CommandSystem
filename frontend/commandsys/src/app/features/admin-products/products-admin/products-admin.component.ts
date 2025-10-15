import { Component, computed, signal, inject, effect } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ProductDialogComponent } from '../UI/product-dialog/product-dialog.component';
import { ProductService } from '../data-access/products.service';
import type { CompanyProduct, CreateCompanyProductDto, Category, Area } from '../data-access/products.models';

@Component({
  standalone: true,
  selector: 'app-products-admin',
  imports: [CommonModule, FormsModule, RouterModule, NgOptimizedImage, MatDialogModule],
  templateUrl: './products-admin.component.html',
})
export class ProductsAdminComponent {
  private dialog = inject(MatDialog);
  productSrv = inject(ProductService);

  // UI
  search = signal('');
  selectedCategory = signal<'Todas' | string>('Todas');

  // Signals del servicio (¡no las invoques aquí!)
  productsSig = this.productSrv.productsSig;

  // Carga inicial
  constructor() {
    this.productSrv.loadAll({ id_company: 5, id_branch: 12 });

    // Diagnóstico opcional
    effect(() => {
      const list = this.productsSig();
      console.log('Products loaded:', list.length, list.slice(0, 2));
    });
  }

  // Lista filtrada
  filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const cat = this.selectedCategory();
    return this.productsSig()
      .filter(p => (cat === 'Todas' ? true : p.category === cat))
      .filter(p => !term ? true :
        p.name.toLowerCase().includes(term) ||
        (p.category ?? '').toLowerCase().includes(term) ||
        (p.area ?? '').toLowerCase().includes(term)
      );
  });

  // Métricas por categoría (de strings devueltos por backend)
  metrics = computed(() => {
    const map = new Map<string, { total: number; disponibles: number }>();
    for (const p of this.productsSig()) {
      const key = p.category ?? 'Sin categoría';
      if (!map.has(key)) map.set(key, { total: 0, disponibles: 0 });
      const m = map.get(key)!;
      m.total += 1;
      if (p.is_active === 1) m.disponibles += 1;
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  });

  // Imagen (placeholder porque ignoramos image_url)
  imgPlaceholder = '/assets/placeholders/product.png';
  img(_p: CompanyProduct) { return this.imgPlaceholder; }

  // Dialogs
  openCreate() {
    this.dialog.open(ProductDialogComponent, {
      data: { mode: 'create' },
      panelClass: 'rounded-2xl',
    }).afterClosed().subscribe((res: { dto: CreateCompanyProductDto; file: File | null } | null) => {
      if (!res) return;
      this.productSrv.create(res.dto, res.file ?? undefined);
    });
  }

  openEdit(p: CompanyProduct) {
    this.dialog.open(ProductDialogComponent, {
      data: { mode: 'edit', value: p },
      panelClass: 'rounded-2xl',
    }).afterClosed().subscribe((res: { dto: Partial<CreateCompanyProductDto>; file: File | null } | null) => {
      if (!res) return;
      this.productSrv.update(p.id_company_product, res.dto, res.file ?? undefined);
    });
  }

  toggleAvailability(p: CompanyProduct) {
    const next = p.is_active !== 1;
    this.productSrv.setActive(p.id_company_product, next);
  }

  delete(p: CompanyProduct) {
    if (confirm(`Eliminar "${p.name}"?`)) this.productSrv.remove(p.id_company_product);
  }

  trackById = (_: number, p: CompanyProduct) => p.id_company_product;
}

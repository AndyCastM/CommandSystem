import { Component, computed, signal, inject, effect, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, NgOptimizedImage, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';

import { BranchProductsService } from '../../../core/services/products/branch-products.service';
import { ProductAreasService } from '../../../core/services/products/products-area.service';
import { ToastService } from '../../../shared/UI/toast.service';
import { take } from 'rxjs';
import type { BranchProduct } from '../../../core/services/products/products.models';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-branch-products',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatDialogModule,
    MatSelect,
    MatOption,
    MatIcon,
    NgClass
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {

  private dialog = inject(MatDialog);
  branchSrv = inject(BranchProductsService);
  toast = inject(ToastService);
  areasService = inject(ProductAreasService);

  // UI
  search = signal('');
  selectedCategory = signal<'Todas' | string>('Todas');

  // Signals del servicio
  productsSig = this.branchSrv.productsSig;

  // Cache de imágenes (id -> url)
  private thumbMap = new WeakMap<BranchProduct, string>();

  // Placeholder para imágenes
  private placeholderDataUrl =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="180" height="120">
        <rect width="100%" height="100%" fill="#f1f5f9"/>
        <g fill="#cbd5e1">
          <rect x="16" y="20" width="148" height="80" rx="8"/>
          <circle cx="56" cy="60" r="16"/>
          <path d="M32 92 L88 44 L148 92 Z" />
        </g>
      </svg>
    `);

  constructor() {
    // Diagnóstico opcional
    effect(() => {
      const list = this.productsSig();
      console.debug('Productos visibles:', list.length);
    });

    // Prefetch de imágenes visibles
    effect(() => {
      const visible = this.filtered().slice(0, 24);
      visible.forEach(p => this.branchSrv.getThumbUrl$(p.id_company_product).pipe(take(1)).subscribe());
    });
  }

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async ngOnInit() {
    if (!this.isBrowser) return;
    // Carga inicial
    this.branchSrv.loadAll().pipe(take(1)).subscribe();
  }

  // === Lista filtrada ===
  filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const cat = this.selectedCategory();
    return this.productsSig()
      .filter(p => (cat === 'Todas' ? true : p.category === cat))
      .filter(p =>
        !term
          ? true
          : p.name.toLowerCase().includes(term) ||
            (p.category ?? '').toLowerCase().includes(term) ||
            (p.area ?? '').toLowerCase().includes(term)
      );
  });

  // === Métricas por categoría ===
  metricsCat = computed(() => {
    const map = new Map<string, { total: number; disponibles: number }>();
    for (const p of this.productsSig()) {
      const key = p.category ?? 'Sin categoría';
      if (!map.has(key)) map.set(key, { total: 0, disponibles: 0 });
      const m = map.get(key)!;
      m.total++;
      if (p.is_active === true) m.disponibles++;
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  });

  // === Métricas por área ===
  metrics = computed(() => {
    const map = new Map<string, { total: number; disponibles: number }>();
    for (const p of this.productsSig()) {
      const key = p.area ?? 'Sin área';
      if (!map.has(key)) map.set(key, { total: 0, disponibles: 0 });
      const m = map.get(key)!;
      m.total++;
      if (p.is_active === true) m.disponibles++;
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  });

  // === Miniaturas ===
  img(p: BranchProduct) {
    const cached = this.thumbMap.get(p);
    if (cached) return cached;

    this.branchSrv.getThumbUrl$(p.id_company_product)
      .pipe(take(1))
      .subscribe(url => {
        const finalUrl = url ? this.branchSrv.cld(url) : this.placeholderDataUrl;
        this.thumbMap.set(p, finalUrl);
        queueMicrotask(() => this.productsSig.set([...this.productsSig()])); // Forzar redraw
      });

    return this.placeholderDataUrl;
  }

  onImgError(p: BranchProduct, evt: Event) {
    (evt.target as HTMLImageElement).src = this.placeholderDataUrl;
  }

  onCategoryChange(value: string) {
    this.selectedCategory.set(value === 'Todas' ? 'Todas' : value);
  }

  // === Toggle disponibilidad ===
  toggleAvailability(p: BranchProduct) {
    const next = p.is_active === true ? false : true;
    this.branchSrv.toggleActive(p.id_branch_product, next).subscribe({
      next: () => this.toast.success(`Producto ${next ? 'activado' : 'desactivado'}`),
      error: () => this.toast.error('No se pudo actualizar el estado del producto'),
    });
  }

  trackById = (_: number, p: BranchProduct) => p.id_branch_product;
}

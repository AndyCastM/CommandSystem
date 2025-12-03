import {
  Component,
  computed,
  signal,
  inject,
  effect,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import {
  CommonModule,
  NgClass,
  isPlatformBrowser,
} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';

import { ProductDialogComponent } from '../UI/product-dialog/product-dialog.component';
import { AreaFormComponent } from '../UI/area-form/area-form.component';
import { CategoryForm } from '../UI/category-form/category-form';

import { ProductService } from '../../../../core/services/products/products.service';
import type {
  Area,
  CompanyProduct,
  CreateCompanyProductDto,
} from '../../../../core/services/products/products.models';

import { ProductAreasService } from '../../../../core/services/products/products-area.service';
import { ProductCategoriesService } from '../data-access/products-category.service';

import { ToastService } from '../../../../shared/UI/toast.service';

import { take, firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-products-admin',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatDialogModule,
    MatSelect,
    MatOption,
    MatIcon,
    NgClass,
  ],
  templateUrl: './products-admin.component.html',
})
export class ProductsAdminComponent implements OnInit {
  [x: string]: unknown;

  private dialog = inject(MatDialog);
  productSrv = inject(ProductService);
  toast = inject(ToastService);
  areasService = inject(ProductAreasService);
  categoriesService = inject(ProductCategoriesService);

  // UI
  search = signal('');
  selectedCategory = signal<'Todas' | string>('Todas');

  // Signals
  productsSig = this.productSrv.productsSig;

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // cache
  private thumbMap = new WeakMap<CompanyProduct, string>();
  togglingIds = new Set<number>();

  constructor() {
    effect(() => {
      const list = this.productsSig();
    });

    effect(() => {
      const visible = this.filtered().slice(0, 24);
      this.productSrv.warmImagesFor(visible, 4);
    });
  }

  async ngOnInit() {
    if (!this.isBrowser) return;

    // Cargar categorías antes para que metricsCat tenga toda la info
    await firstValueFrom(this.categoriesService.fetchCategories());

    this.productSrv.loadAll().pipe(take(1)).subscribe();
  }

  // ============================
  // LISTA FILTRADA
  // ============================
  filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const cat = this.selectedCategory();

    return this.productsSig()
      .filter((p) => (cat === 'Todas' ? true : p.category === cat))
      .filter((p) =>
        !term
          ? true
          : p.name.toLowerCase().includes(term) ||
            (p.category ?? '').toLowerCase().includes(term) ||
            (p.area ?? '').toLowerCase().includes(term),
      );
  });

  // ============================
  // MÉTRICAS POR CATEGORÍA — FIXED
  // ============================
  metricsCat = computed(() => {
    const categories = this.categoriesService.categoriesSig() ?? [];
    const products = this.productsSig() ?? [];

    const map = new Map<string, { total: number; disponibles: number }>();

    // Inicializa todas las categorías aunque tengan 0 productos
    for (const cat of categories) {
      map.set(cat.name, { total: 0, disponibles: 0 });
    }

    // Recorre productos y súmalos
    for (const p of products) {
      const key = p.category ?? 'Sin categoría';

      if (!map.has(key)) {
        map.set(key, { total: 0, disponibles: 0 });
      }

      const m = map.get(key)!;
      m.total += 1;
      if (p.is_active === 1) m.disponibles += 1;
    }

    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      ...v,
    }));
  });

  // ============================
  // MÉTRICAS POR ÁREA
  // ============================
  metrics = computed(() => {
    const map = new Map<string, { total: number; disponibles: number }>();

    for (const p of this.productsSig()) {
      const key = p.area ?? 'Sin área';
      if (!map.has(key)) map.set(key, { total: 0, disponibles: 0 });
      const m = map.get(key)!;

      m.total += 1;
      if (p.is_active === 1) m.disponibles += 1;
    }

    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  });

  // ============================
  // IMÁGENES
  // ============================
  img(p: CompanyProduct) {
    const cached = this.thumbMap.get(p);
    if (cached) return cached;

    this.productSrv
      .getThumbUrl$(p.id_company_product)
      .pipe(take(1))
      .subscribe((url) => {
        const finalUrl = url ? this.productSrv.cld(url) : this.placeholderDataUrl;
        this.thumbMap.set(p, finalUrl);

        setTimeout(() => {
          this.productsSig.set([...this.productsSig()]);
        }, 0);
      });

    return this.placeholderDataUrl;
  }

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

  onImgError(p: CompanyProduct, evt: Event) {
    (evt?.target as HTMLImageElement).src = this.placeholderDataUrl;
  }

  // ============================
  // SELECTOR DE CATEGORÍA
  // ============================
  onCategoryChange(value: string) {
    this.selectedCategory.set(value === 'Todas' ? 'Todas' : value);
  }

  // ============================
  // DIALOGS
  // ============================
  openCreate() {
    this.dialog
      .open(ProductDialogComponent, {
        data: { mode: 'create' },
        panelClass: 'rounded-2xl',
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) return;

        this.productSrv.create(res.dto, res.file ?? undefined).subscribe({
          next: () => this.toast.success('Producto creado exitosamente'),
          error: () => this.toast.error('Error en creación o subida'),
        });
      });
  }

  openEdit(p: CompanyProduct) {
    this.dialog
      .open(ProductDialogComponent, {
        data: { mode: 'edit', value: p },
        panelClass: 'rounded-2xl',
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) return;

        this.productSrv
          .update(p.id_company_product, res.dto, res.file ?? undefined)
          .pipe(take(1))
          .subscribe({
            next: () => {
              this.toast.success('Producto actualizado correctamente');

              // invalidate thumb
              this.thumbMap.delete(p);
              this.productSrv
                .getThumbUrl$(p.id_company_product)
                .pipe(take(1))
                .subscribe((url) => {
                  const finalUrl = url
                    ? this.productSrv.cld(url)
                    : this.placeholderDataUrl;
                  this.thumbMap.set(p, finalUrl);
                });
            },
            error: () => this.toast.error('No se pudo actualizar el producto'),
          });
      });
  }

  // ============================
  // CREAR ÁREA
  // ============================
  async openCreateArea() {
    const ref = this.dialog.open(AreaFormComponent, { width: '480px' });
    const value = await firstValueFrom(ref.afterClosed());
    if (!value) return;

    try {
      await firstValueFrom(this.areasService.createArea(value));
      this.toast.success('Área creada correctamente');
    } catch (e) {
      this.toast.error('No se pudo crear el área');
    }
  }

  // ============================
  // CREAR CATEGORÍA — FIXED
  // ============================
  async openCreateCategory() {
    const ref = this.dialog.open(CategoryForm, { width: '480px' });
    const value = await firstValueFrom(ref.afterClosed());
    if (!value) return;

    try {
      await firstValueFrom(this.categoriesService.createCategory(value));

      // RECARGA LAS CATEGORÍAS
      await firstValueFrom(this.categoriesService.fetchCategories());

      this.toast.success('Categoría creada correctamente');
    } catch (e) {
      this.toast.error('No se pudo crear la categoría');
    }
  }

  // ============================
  // TOGGLE DISPONIBILIDAD
  // ============================
  toggleAvailability(p: CompanyProduct) {
    if (!p) return;
    if (this.togglingIds.has(p.id_company_product)) return;

    this.togglingIds.add(p.id_company_product);

    const next = !this.isActive(p);
    this.productSrv.setActive(p.id_company_product, next).subscribe({
      next: () => {
        this.togglingIds.delete(p.id_company_product);
      },
      error: () => {
        this.togglingIds.delete(p.id_company_product);
        this.toast.error('No se pudo actualizar el estado del producto');
      },
    });
  }

  isActive = (p: CompanyProduct) => p?.is_active === 1;

  trackById = (_: number, p: CompanyProduct) => p.id_company_product;
}

import { Component, computed, signal, inject, effect, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ProductDialogComponent } from '../UI/product-dialog/product-dialog.component';
import { ProductService } from '../../../../core/services/products/products.service';
import type { Area, CompanyProduct, CreateCompanyProductDto } from '../../../../core/services/products/products.models';
import { take } from 'rxjs';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import { ToastService } from '../../../../shared/UI/toast.service';
import { AreaFormComponent } from '../UI/area-form/area-form.component';
import { CategoryForm } from '../UI/category-form/category-form';
import { ProductAreasService } from '../../../../core/services/products/products-area.service';
import { ProductCategoriesService } from '../data-access/products-category.service';
import { firstValueFrom } from 'rxjs';
import { NgClass } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-products-admin',
  imports: [CommonModule, FormsModule, RouterModule, NgOptimizedImage, MatDialogModule, MatSelect, MatOption, MatIcon, NgClass],
  templateUrl: './products-admin.component.html',
})
export class ProductsAdminComponent implements OnInit{
[x: string]: unknown;
  private dialog = inject(MatDialog);
  productSrv = inject(ProductService);
  toast = inject(ToastService);
  areasService = inject(ProductAreasService);
  categoriesService = inject(ProductCategoriesService);

  // UI
  search = signal('');
  selectedCategory = signal<'Todas' | string>('Todas');

  // Signals del servicio
  productsSig = this.productSrv.productsSig;

  // Cache de imágenes (id -> url)
  private imagesCache = new Map<number, string>();

  togglingIds = new Set<number>();

  isActive = (p: CompanyProduct) => p?.is_active === 1;

  // Placeholder inline (SVG) para no depender de /assets
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
    });

    // Prefetch con concurrencia limitada para los visibles (mejora UX y reduce parpadeo)
    effect(() => {
      const visible = this.filtered().slice(0, 24); // ajusta N
      this.productSrv.warmImagesFor(visible, 4);
    });
  }

  ngOnInit(){
    // Carga de productos/catálogos
      this.productSrv.loadAll().pipe(take(1)).subscribe();
  }

  // Lista filtrada
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

  // Métricas por categoría
  metricsCat = computed(() => {
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

  // Metricas por area
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


  private thumbMap = new WeakMap<CompanyProduct, string>();

  img(p: CompanyProduct) {
    const current = this.thumbMap.get(p);
    if (current) return current;

    this.productSrv.getThumbUrl$(p.id_company_product)
      .pipe(take(1))
      .subscribe(url => {
        const finalUrl = url ? this.productSrv.cld(url) : this.placeholderDataUrl;
        this.thumbMap.set(p, finalUrl);

        //forzamos a Angular a redibujar en el siguiente tick
        queueMicrotask(() => { this.productsSig.set([...this.productsSig()]); });
      });

    return this.placeholderDataUrl;
  }


  // Manejo de error en <img> (caer a placeholder y evitar loops)
  onImgError(p: CompanyProduct, evt: Event) {
    (evt?.target as HTMLImageElement).src = this.placeholderDataUrl;
  }

  onCategoryChange(value: string) {
    if (value === 'Todas') {
      this.selectedCategory.set('Todas');
      // no necesitas tocar filtered(); tu computed ya respeta 'Todas'
    } else {
      this.selectedCategory.set(value);
    }
  }

  // Dialogs
  openCreate() {
    this.dialog.open(ProductDialogComponent, {
      data: { mode: 'create' },
      panelClass: 'rounded-2xl',
    }).afterClosed().subscribe((res) => {
      if (!res) return;
      
      // ahora sí: el componente controla el subscribe
      this.productSrv.create(res.dto, res.file ?? undefined).subscribe({
        next: (created) => {
          console.log('Producto creado:', created);
        },
        error: (err) => {
          console.error('Error en creación o subida:', err);
        },
      });
    });
  }


  openEdit(p: CompanyProduct) {
    this.dialog.open(ProductDialogComponent, {
      data: { mode: 'edit', value: p },
      panelClass: 'rounded-2xl',
    }).afterClosed().subscribe((res: { dto: Partial<CreateCompanyProductDto>; file: File | null } | null) => {
      if (!res) return;
      this.productSrv.update(p.id_company_product, res.dto, res.file ?? undefined);
      // invalida miniatura y la volverá a precargar
      this.thumbMap.delete(p);
      this.productSrv.getThumbUrl$(p.id_company_product).pipe(take(1)).subscribe(url => {
        const finalUrl = url ? this.productSrv.cld(url) : this.placeholderDataUrl;
        this.thumbMap.set(p, finalUrl);
      });
    });
  }

  async openCreateArea() {
    const ref = this.dialog.open(AreaFormComponent, { width: '480px' });
    const value = await firstValueFrom(ref.afterClosed());
    if (!value) return;

    try {
      await firstValueFrom(this.areasService.createArea(value));
      this.toast.success('Área creada correctamente');
    } catch (e) {
      console.error('Error al crear área:', e);
      this.toast.error('No se pudo crear el área');
    }
  }

  async openCreateCategory(){
    const ref = this.dialog.open(CategoryForm, { width: '480px' });
    const value = await firstValueFrom(ref.afterClosed());
    if (!value) return;

    try {
      await firstValueFrom(this.categoriesService.createCategory(value));
      this.toast.success('Categoría creada correctamente');
    } catch (e) {
      console.error('Error al crear categoría:', e);
      this.toast.error('No se pudo crear la caategoría');
    }
  }

  toggleAvailability(p: CompanyProduct) {
    if (!p) return;
    if (this.togglingIds.has(p.id_company_product)) return;
    this.togglingIds.add(p.id_company_product);

    const next = !this.isActive(p);
    this.productSrv.setActive(p.id_company_product, next).subscribe({
      next: () => this.togglingIds.delete(p.id_company_product),
      error: () => this.togglingIds.delete(p.id_company_product),
    });
  }

  delete(p: CompanyProduct) {
    if (confirm(`Eliminar "${p.name}"?`)) {
      this.productSrv.remove(p.id_company_product);
      this.imagesCache.delete(p.id_company_product);
    }
  }

  trackById = (_: number, p: CompanyProduct) => p.id_company_product;
}

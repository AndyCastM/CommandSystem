import { Component, Inject, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ProductAreasService } from '../../data-access/products-area.service';
import { ProductCategoriesService } from '../../data-access/products-category.service';
import type {
  Product, ProductDialogData, ProductCategory, ProductArea
} from '../../data-access/products.models';

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './product-dialog.component.html',
})
export class ProductDialogComponent {
  private fb = inject(FormBuilder);
  private sb = inject(MatSnackBar);
  private areasSrv = inject(ProductAreasService);
  private categSrv = inject(ProductCategoriesService);

  saving = signal(false);
  imagePreview = signal<string | null>(null);
  editing = signal<boolean>(false);

  // categorías estáticas por ahora (si luego llegan del BE, reemplaza)
  categories = signal<ProductCategory[]>([]);
  loadingCategories = signal<boolean>(true);

  // Áreas dinámicas
  areas = signal<ProductArea[]>([]);
  loadingAreas = signal<boolean>(true);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120), this.noOnlySpaces]],
    price: <number | null>0,
    category: <ProductCategory | ''>'',
    id_area: <number | null>null,
    description: [''],
    image: [''],          // URL (o dataURL si se sube primero)
    available: true,
    file: [null as File | null], // para adjunto local
  });

  title = computed(() => (this.editing() ? 'Editar Producto' : 'Nuevo Producto'));
  subtitle = computed(() => (this.editing() ? 'Modifica los datos del producto' : 'Complete los datos del nuevo producto'));
  
  document: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData,
    private ref: MatDialogRef<ProductDialogComponent, Product | null>,
  ) {
    const v = data?.value ?? ({} as Product);
    this.editing.set(data?.mode === 'edit');

    // set inicial
    this.form.patchValue({
      name: v.name ?? '',
      price: v.price ?? 0,
      category: (v.category as ProductCategory) ?? '',
      id_area: v.id_area ?? null,
      description: v.description ?? '',
      image: v.image ?? '',
      available: v.is_active ?? true,
      file: null,
    });

    if (v.image) this.imagePreview.set(v.image);

    // Cargar áreas (cache si existe; si no, fetch)
    const cached = this.areasSrv.cached;
    if (cached) {
      this.areas.set(cached);
      this.loadingAreas.set(false);
    } else {
      this.areasSrv
        .fetchAreas()
        .subscribe({
          next: list => { this.areas.set(list); this.loadingAreas.set(false); },
          error: () => { this.sb.open('No se pudieron cargar las áreas', 'OK', { duration: 2500 }); this.loadingAreas.set(false); }
        });
    }

    // Cargar categorias
    const cachedCat = this.categSrv.cached;
    if (cachedCat) {
      this.categories.set(cachedCat);
      this.loadingCategories.set(false);
    } else {
      this.categSrv
        .fetchCategories()
        .subscribe({
          next: list => { this.categories.set(list); this.loadingCategories.set(false); },
          error: () => { this.sb.open('No se pudieron cargar las categorías', 'OK', { duration: 2500 }); this.loadingCategories.set(false); }
        });
    }
  }

  // --- Validadores & helpers
  noOnlySpaces(ctrl: AbstractControl): ValidationErrors | null {
    const val = (ctrl.value ?? '') as string;
    return val.trim().length ? null : { onlySpaces: true };
  }
  showError(name: string, err: string) {
    const c = this.form.get(name);
    return !!c && (c.touched || c.dirty) && c.hasError(err);
  }

  // --- Imagen
  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.form.patchValue({ file });
    if (!file) { this.imagePreview.set(null); return; }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      this.sb.open('La imagen supera 5MB', 'OK', { duration: 2500 });
      this.form.patchValue({ file: null });
      (input as HTMLInputElement).value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.imagePreview.set(dataUrl);
      // si quieres guardar como URL cuando subas a Cloudinary, deja solo el preview aquí
    };
    reader.readAsDataURL(file);
  }
  clearImage() {
    this.imagePreview.set(null);
    this.form.patchValue({ image: '', file: null });
  }

  // --- Submit
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.sb.open('Corrige los campos marcados antes de guardar', 'OK', { duration: 3000 });
      return;
    }

    // limpieza y parseos
    const raw = this.form.getRawValue();
    const payload: Product = {
      ...(this.data?.value ?? {}),
      name: raw.name.trim(),
      price: Number(raw.price ?? 0),
      category: raw.category as ProductCategory,
      id_area: Number(raw.id_area),
      description: (raw.description ?? '').trim() || undefined,
      // image: si ya subiste a la nube, reemplaza con URL real; aquí usamos la de la caja de texto (o preview)
      image: raw.image?.trim() || this.imagePreview() || undefined,
      is_active: !!raw.available,
    };

    this.saving.set(true);
    // aquí normalmente llamarías a tu servicio HTTP; como es diálogo, devolvemos el payload
    this.ref.close(payload);
  }

  close() { this.ref.close(null); }
}

import { Component, Inject, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { ProductService } from '../../data-access/products.service';
import type { CompanyProduct, CreateCompanyProductDto, Category, Area } from '../../data-access/products.models';

export type DialogMode = 'create' | 'edit';
export interface ProductDialogData {
  mode: DialogMode;
  value?: CompanyProduct;
  id_company?: number;
  id_branch?: number;
  categories?: Category[];
  areas?: Area[];
}

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './product-dialog.component.html',
  styleUrls: ['./product-dialog.component.css']
})
export class ProductDialogComponent {
  private fb = inject(FormBuilder);
  private sb = inject(MatSnackBar);
  private productSrv = inject(ProductService);

  saving = signal(false);
  imagePreview = signal<string | null>(null);
  editing = signal<boolean>(false);

  categories = signal<Category[]>([]);
  areas = signal<Area[]>([]);
  loadingCategories = signal<boolean>(true);
  loadingAreas = signal<boolean>(true);

  form = this.fb.nonNullable.group({
    id_category: <number | null>null,
    id_area: <number | null>null,
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120), this.noOnlySpaces]],
    description: [''],
    base_price: <number | null>0,
    preparation_time: <number | null>null,
    image_url: [''],            // URL pegada (opcional)
    file: [null as File | null] // archivo local (opcional)
  });

  title = computed(() => (this.editing() ? 'Editar Producto' : 'Nuevo Producto'));
  subtitle = computed(() => (this.editing() ? 'Modifica los datos del producto' : 'Complete los datos del nuevo producto'));

  // --- helpers para mapear nombres (string) -> ids
  private findCategoryIdByName(name?: string | null) {
    if (!name) return null;
    const match = this.categories().find(
      c => (c.name ?? '').trim().toLowerCase() === name.trim().toLowerCase()
    );
    return match?.id_category ?? null;
  }
  private findAreaIdByName(name?: string | null) {
    if (!name) return null;
    const match = this.areas().find(
      a => (a.name ?? '').trim().toLowerCase() === name.trim().toLowerCase()
    );
    return match?.id_area ?? null;
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData,
    private ref: MatDialogRef<ProductDialogComponent, { dto: CreateCompanyProductDto | Partial<CreateCompanyProductDto>; file: File | null } | null>,
  ) {
    const v = (data?.value ?? {}) as CompanyProduct;
    this.editing.set(data?.mode === 'edit');

    // Prefill básico (incluye preparation_time si viene del backend)
    this.form.patchValue({
      name: v.name ?? '',
      base_price: v.base_price ?? 0,
      description: (v as any).description ?? '', // si backend llega a mandar descripción, se muestra
      preparation_time: (v as any).preparation_time ?? null,
      image_url: ''
      // id_category e id_area se setean al cargar catálogos (mapeo por nombre)
    });

    // --- Cargar CATEGORÍAS (data -> cache -> fetch)
    const catsCached = data?.categories ?? this.productSrv.categoriesCached;
    if (catsCached?.length) {
      this.categories.set(catsCached);
      this.loadingCategories.set(false);
    } else {
      this.productSrv.fetchCategories().subscribe({
        next: list => { this.categories.set(list); this.loadingCategories.set(false); },
        error: () => { this.loadingCategories.set(false); this.sb.open('No se pudieron cargar las categorías', 'OK', { duration: 2500 }); }
      });
    }

    // --- Cargar ÁREAS (data -> cache -> fetch)
    const areasCached = data?.areas ?? this.productSrv.areasCached;
    if (areasCached?.length) {
      this.areas.set(areasCached);
      this.loadingAreas.set(false);
    } else {
      this.productSrv.fetchAreas().subscribe({
        next: list => { this.areas.set(list); this.loadingAreas.set(false); },
        error: () => { this.loadingAreas.set(false); this.sb.open('No se pudieron cargar las áreas', 'OK', { duration: 2500 }); }
      });
    }

    // --- Si es edición, precargar preview con la 1ª imagen real del producto
    if (this.editing() && v?.id_company_product) {
      this.productSrv.getProductImages(v.id_company_product).subscribe(list => {
        const first = list?.[0]?.image_url ?? null;
        if (first) this.imagePreview.set(first);
      });
    }

    // --- Cuando catálogos ya estén listos y es edición, mapea nombre->id y setea selects
    effect(() => {
      if (!this.editing()) return;
      if (this.loadingCategories() || this.loadingAreas()) return;

      const catId = this.findCategoryIdByName((v as any).category ?? null);
      const areaId = this.findAreaIdByName((v as any).area ?? null);

      this.form.patchValue(
        { id_category: catId, id_area: areaId },
        { emitEvent: false }
      );
    });

    // --- Reglas de habilitación para evitar warnings de disabled en forms
    effect(() => {
      if (this.loadingCategories()) this.form.controls.id_category.disable({ emitEvent: false });
      else this.form.controls.id_category.enable({ emitEvent: false });

      if (this.loadingAreas()) this.form.controls.id_area.disable({ emitEvent: false });
      else this.form.controls.id_area.enable({ emitEvent: false });
    });

    // Validadores requeridos
    this.form.controls.id_category.addValidators([Validators.required]);
    this.form.controls.id_area.addValidators([Validators.required]);
  }

  // --- Validadores & helpers
  noOnlySpaces(ctrl: AbstractControl): ValidationErrors | null {
    const val = (ctrl.value ?? '') as string;
    return val.trim().length ? null : { onlySpaces: true };
  }
  showError(name: keyof typeof this.form.controls, err: string) {
    const c = this.form.get(String(name));
    return !!c && (c.touched || c.dirty) && c.hasError(err);
  }

  // --- Imagen (archivo)
  triggerFilePick() {
    document.getElementById('image-upload')?.click();
  }
  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.form.patchValue({ file });
    if (!file) { this.imagePreview.set(null); return; }

    if (!/^image\//i.test(file.type)) {
      this.sb.open('El archivo seleccionado no es una imagen', 'OK', { duration: 2500 });
      this.form.patchValue({ file: null });
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.sb.open('La imagen supera 5MB', 'OK', { duration: 2500 });
      this.form.patchValue({ file: null });
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }
  clearImage() {
    this.imagePreview.set(null);
    this.form.patchValue({ image_url: '', file: null });
    const input = document.getElementById('image-upload') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  // --- Submit
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.sb.open('Corrige los campos marcados antes de guardar', 'OK', { duration: 3000 });
      return;
    }

    const raw = this.form.getRawValue();
    const dto: CreateCompanyProductDto = {
      id_category: Number(raw.id_category),
      id_area: Number(raw.id_area),
      name: String(raw.name).trim(),
      description: (raw.description ?? '').trim() || undefined,
      base_price: Number(raw.base_price ?? 0),
      preparation_time: raw.preparation_time != null ? Number(raw.preparation_time) : undefined,
      // options: [] // si activas personalizaciones, mapea aquí
    };

    const file = raw.file as File | null;
    this.saving.set(true);
    this.ref.close({ dto, file });
  }

  close() { this.ref.close(null); }
}

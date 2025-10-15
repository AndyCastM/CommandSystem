import { Component, Inject, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

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
  ],
  templateUrl: './product-dialog.component.html',
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

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData,
    private ref: MatDialogRef<ProductDialogComponent, { dto: CreateCompanyProductDto | Partial<CreateCompanyProductDto>; file: File | null } | null>,
  ) {
    const v = (data?.value ?? {}) as CompanyProduct;
    this.editing.set(data?.mode === 'edit');

    this.form.patchValue({
      name: v.name ?? '',
      base_price: v.base_price ?? 0,
      description: '',
      preparation_time: null,
      image_url: ''
      // id_category e id_area los elige el usuario
    });

    // Catálogos desde data o cache o fetch
    const catsCached = data?.categories ?? this.productSrv.categoriesCached;
    if (catsCached?.length) { this.categories.set(catsCached); this.loadingCategories.set(false); }
    else {
      this.productSrv.fetchCategories().subscribe({
        next: list => { this.categories.set(list); this.loadingCategories.set(false); },
        error: () => { this.loadingCategories.set(false); this.sb.open('No se pudieron cargar las categorías', 'OK', { duration: 2500 }); }
      });
    }
    const areasCached = data?.areas ?? this.productSrv.areasCached;
    if (areasCached?.length) { this.areas.set(areasCached); this.loadingAreas.set(false); }
    else {
      this.productSrv.fetchAreas().subscribe({
        next: list => { this.areas.set(list); this.loadingAreas.set(false); },
        error: () => { this.loadingAreas.set(false); this.sb.open('No se pudieron cargar las áreas', 'OK', { duration: 2500 }); }
      });
    }
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
      image_url: raw.image_url?.trim() || undefined,
      preparation_time: raw.preparation_time != null ? Number(raw.preparation_time) : undefined,
      // options: [] // si activas personalizaciones, mapea aquí
    };
    const file = raw.file as File | null;

    this.saving.set(true);
    this.ref.close({ dto, file });
  }

  close() { this.ref.close(null); }
}

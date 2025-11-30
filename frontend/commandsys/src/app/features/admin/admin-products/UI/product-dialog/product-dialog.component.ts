import { Component, Inject, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors,
  FormArray, FormGroup, FormControl
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { ProductService } from '../../../../../core/services/products/products.service';
import type {
  CompanyProduct,
  CreateCompanyProductDto,
  Category,
  Area,
  ProductDetail,                
} from '../../../../../core/services/products/products.models';
import { CustomizationFormComponent } from '../customization-form/customization-form.component';
import { ProductAreasService } from '../../../../../core/services/products/products-area.service';
import { ProductCategoriesService } from '../../../../../core/services/products/products-category.service';
import { ChangeDetectorRef } from '@angular/core';

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
    MatFormFieldModule,
    CustomizationFormComponent,
  ],
  templateUrl: './product-dialog.component.html',
  styleUrls: ['./product-dialog.component.css']
})
export class ProductDialogComponent {
  private fb = inject(FormBuilder);
  private sb = inject(MatSnackBar);
  private productSrv = inject(ProductService);
  private areasSrv = inject(ProductAreasService);
  private catSrv = inject(ProductCategoriesService);
  private cdr = inject(ChangeDetectorRef);

  saving = signal(false);
  imagePreview = signal<string | null>(null);
  editing = signal<boolean>(false);

  categories = this.catSrv.categoriesSig;
  areas = this.areasSrv.areasSig;

  loadingCategories = this.catSrv.loadingSig;
  loadingAreas = this.areasSrv.loadingSig;

  form = this.fb.nonNullable.group({
    id_category: <number | null>null,
    id_area: <number | null>null,
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120), this.noOnlySpaces]],
    description: [''],
    base_price: <number | null>0,
    preparation_time: <number | null>null,
    image_url: [''],
    file: [null as File | null],
    is_customizable: [false],
    options: this.fb.array<FormGroup>([])
  });

  // ======= Getters =======
  get options() { return this.form.controls.options as FormArray<FormGroup>; }
  getOptionValues(i: number) { return this.options.at(i).get('values') as FormArray<FormGroup>; }
  getOptionTiers(i: number) { return this.options.at(i).get('tiers') as FormArray<FormGroup>; }

  title = computed(() => (this.editing() ? 'Editar Producto' : 'Nuevo Producto'));
  subtitle = computed(() => (this.editing() ? 'Modifica los datos del producto' : 'Complete los datos del nuevo producto'));

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData,
    private ref: MatDialogRef<ProductDialogComponent, { dto: CreateCompanyProductDto | Partial<CreateCompanyProductDto>; file: File | null } | null>,
  ) {
    const v = (data?.value ?? {}) as CompanyProduct;
    this.editing.set(data?.mode === 'edit');

    // Patch básico
    this.form.patchValue({
      name: v.name ?? '',
      base_price: v.base_price ?? 0,
      preparation_time: (v as any).preparation_time ?? null,
    });

    // === Cargar categorías y áreas si aún no existen ===
    if (!this.catSrv.categoriesSig().length) {
      this.catSrv.fetchCategories().subscribe({
        error: () => this.sb.open('No se pudieron cargar las categorías', 'OK', { duration: 2500 })
      });
    }

    this.areasSrv.fetchAreas().subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingAreas.set(false);
        this.sb.open('No se pudieron cargar las áreas', 'OK', { duration: 2500 });
      }
    });

    // Cargar imagen en edición (solo imágenes ligadas, lo puedes dejar o quitar si usas image_url del detail)
    if (this.editing() && v?.id_company_product) {
      this.productSrv.getProductImages(v.id_company_product).subscribe(list => {
        const first = list?.[0]?.image_url ?? null;
        if (first) this.imagePreview.set(first);
      });
    }

    // Cargar detalle COMPLETO (con opciones) cuando estamos editando
    if (this.editing() && v?.id_company_product) {
      this.productSrv.getCompanyProductDetail(v.id_company_product).subscribe({
        next: (res) => {
          const detail: ProductDetail = res.data;

          // Patch de categoría / área si hace falta
          this.form.patchValue({
            id_category: v.id_category ?? detail.id_category ?? null,
            id_area: v.id_area ?? detail.id_area ?? null,
            description: detail.description,
          }, { emitEvent: false });

          // Imagen desde el detail si no hay preview todavía
          if (detail.image_url && !this.imagePreview()) {
            this.imagePreview.set(detail.image_url);
          }

          // Opciones -> abrir panel derecho si existen
          if (detail.options && detail.options.length > 0) {
            this.loadOptionsFromDetail(detail);
            this.form.controls.is_customizable.setValue(true, { emitEvent: false });
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error cargando detalle de producto con opciones:', err);
        }
      });
    }

    this.form.controls.id_category.addValidators([Validators.required]);
    this.form.controls.id_area.addValidators([Validators.required]);

    // 1) Sincronizar disabled de los selects con las signals de loading (SIN usar [disabled] en template)
    effect(() => {
      const loadingCats = this.loadingCategories();
      const loadingAreas = this.loadingAreas();

      if (loadingCats) {
        this.form.controls.id_category.disable({ emitEvent: false });
      } else {
        this.form.controls.id_category.enable({ emitEvent: false });
      }

      if (loadingAreas) {
        this.form.controls.id_area.disable({ emitEvent: false });
      } else {
        this.form.controls.id_area.enable({ emitEvent: false });
      }
    });

    // 2) Animación ancho dialog según is_customizable
    effect(() => {
      const custom = this.form.controls.is_customizable.value;
      const dialog = document.querySelector('.mat-mdc-dialog-surface');
      if (!dialog) return;

      if (custom) {
        dialog.classList.add('transition-all', 'duration-300');
      } else {
        dialog.classList.remove('transition-all', 'duration-300');
      }
    });

    // 3) Cargar selección de categoría/área una vez listas
    effect(() => {
      const catsReady = !this.loadingCategories();
      const areasReady = !this.loadingAreas();
      const v = this.data?.value;

      if (this.editing() && v && catsReady && areasReady) {
        // Evita re-patchear si ya se cargó correctamente
        if (!this.form.value.id_category && !this.form.value.id_area) {
          this.form.patchValue({
            id_category: v.id_category ?? null,
            id_area: v.id_area ?? null,
          });
        }
      }
    });
  }

  // ======= Helpers =======
  noOnlySpaces(ctrl: AbstractControl): ValidationErrors | null {
    const val = (ctrl.value ?? '') as string;
    return val.trim().length ? null : { onlySpaces: true };
  }

  showError(name: keyof typeof this.form.controls, err: string) {
    const c = this.form.get(String(name));
    return !!c && (c.touched || c.dirty) && c.hasError(err);
  }

  // ======= Imagen =======
  triggerFilePick() { document.getElementById('image-upload')?.click(); }

  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.form.patchValue({ file });
    if (!file) { this.imagePreview.set(null); return; }

    if (!/^image\//i.test(file.type)) {
      this.sb.open('El archivo seleccionado no es una imagen', 'OK', { duration: 2500 });
      this.form.patchValue({ file: null }); input.value = ''; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.sb.open('La imagen supera 5MB', 'OK', { duration: 2500 });
      this.form.patchValue({ file: null }); input.value = ''; return;
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

  // ======= Opciones =======

  /** Llena el FormArray `options` a partir del ProductDetail (detail de la API) */
  private loadOptionsFromDetail(detail: ProductDetail) {
    const opts = detail.options ?? [];
    if (!opts.length) return;

    this.options.clear();

    for (const o of opts) {
      const valuesFA = this.fb.array<FormGroup>(
        (o.values ?? []).map(val =>
          this.fb.group({
            name: [val.name ?? ''],
            extra_price: [val.extra_price ?? 0],
          })
        )
      );

      const tiersFA = this.fb.array<FormGroup>(
        (o.tiers ?? []).map(t =>
          this.fb.group({
            selection_count: [t.selection_count ?? 1],
            extra_price: [t.extra_price ?? 0],
          })
        )
      );

      const optionGroup = this.fb.group({
        name: [o.name ?? ''],
        is_required: [o.is_required ? 1 : 0],
        multi_select: [o.multi_select ? 1 : 0],
        max_selection: [o.max_selection ?? 1],
        values: valuesFA,
        tiers: tiersFA,
      });

      this.options.push(optionGroup);
    }
  }

  addOption() {
    const option = this.fb.group({
      name: [''],
      is_required: [0],
      multi_select: [0],
      max_selection: [1],
      values: this.fb.array<FormGroup>([]),
      tiers: this.fb.array<FormGroup>([])
    });
    this.options.push(option);
  }

  removeOption(i: number) { this.options.removeAt(i); }

  addValue(optIdx: number) {
    this.getOptionValues(optIdx).push(
      this.fb.group({ name: [''], extra_price: [0] })
    );
  }

  removeValue(e: { optIdx: number; valIdx: number }) {
    this.getOptionValues(e.optIdx).removeAt(e.valIdx);
  }

  addTier(optIdx: number) {
    this.getOptionTiers(optIdx).push(
      this.fb.group({ selection_count: [1], extra_price: [0] })
    );
  }

  removeTier(e: { optIdx: number; tierIdx: number }) {
    this.getOptionTiers(e.optIdx).removeAt(e.tierIdx);
  }

  // ======= Submit =======
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
      description: raw.description ?? '',
      base_price: Number(raw.base_price ?? 0),
      image_url: raw.image_url ?? '',
      preparation_time: raw.preparation_time != null ? Number(raw.preparation_time) : undefined,
      options: raw.is_customizable
        ? raw.options.map(o => ({
            name: o['name'],
            is_required: o['is_required'] ? 1 : 0,
            multi_select: o['multi_select'] ? 1 : 0,
            max_selection: Number(o['max_selection'] ?? 1),
            tiers: o['tiers'].map((t: { selection_count: any; extra_price: any; }) => ({
              selection_count: Number(t.selection_count),
              extra_price: Number(t.extra_price ?? 0)
            })),
            values: o['values'].map((v: { name: any; extra_price: any; }) => ({
              name: v.name,
              extra_price: Number(v.extra_price ?? 0)
            }))
          }))
        : []
    };

    const file = raw.file as File | null;
    this.saving.set(true);
    this.ref.close({ dto, file });
  }

  close() { this.ref.close(null); }

  getControl<T = any>(group: FormGroup, name: string): FormControl<T> {
    return group.get(name) as FormControl<T>;
  }

  getArray(group: FormGroup, name: string): FormArray<FormGroup> {
    return group.get(name) as FormArray<FormGroup>;
  }
}

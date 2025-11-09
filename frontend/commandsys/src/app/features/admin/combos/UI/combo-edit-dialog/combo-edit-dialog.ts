import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { ToastService } from '../../../../../shared/UI/toast.service';
import { CombosService } from '../../data-access/combos.service';
import { ProductService } from '../../../../../core/services/products/products.service';
import { firstValueFrom } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-combo-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './combo-edit-dialog.html',
})
export class ComboEditDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private api = inject(CombosService);
  private productsService = inject(ProductService);
  dialogRef = inject(MatDialogRef<ComboEditDialogComponent>);
  products: any[] = [];

  form!: FormGroup;
  loading = true;
  
  private cdr = inject(ChangeDetectorRef);

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get groups(): FormArray {
    return this.form.get('groups') as FormArray;
  }

  async ngOnInit() {
    try {
      const { products } = await firstValueFrom(this.productsService.loadAll());
      this.products = products;

      this.form = this.fb.group({
        name: [this.data.name, Validators.required],
        description: [this.data.description],
        base_price: [this.data.base_price, [Validators.required, Validators.min(0)]],
        items: this.fb.array([]),
        groups: this.fb.array([]),
      });

      this.populateForm(this.data);
    } catch (err) {
      console.error(err);
      this.toast.error('Error al cargar datos del combo');
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // fuerza el refresco del template

    }
  }

  populateForm(combo: any) {
    // Productos fijos
    combo.combo_items?.forEach((i: any) => {
      this.items.push(
        this.fb.group({
          id_company_product: [i.id_company_product, Validators.required],
          quantity: [i.quantity, [Validators.required, Validators.min(1)]],
        })
      );
    });

    // Grupos configurables
    combo.combo_groups?.forEach((g: any) => {
      const group = this.fb.group({
        label: [g.label, Validators.required],
        max_selection: [g.max_selection, [Validators.required, Validators.min(1)]],
        is_required: [g.is_required],
        options: this.fb.array([]),
      });

      g.combo_group_options?.forEach((o: any) => {
        (group.get('options') as FormArray).push(
          this.fb.group({
            id_company_product: [o.id_company_product, Validators.required],
            extra_price: [o.extra_price || 0],
          })
        );
      });

      this.groups.push(group);
    });
  }

  addItem() {
    this.items.push(
      this.fb.group({
        id_company_product: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
      })
    );
  }

  removeItem(i: number) {
    this.items.removeAt(i);
  }

  addGroup() {
    const group = this.fb.group({
      label: ['', Validators.required],
      max_selection: [1, [Validators.required, Validators.min(1)]],
      is_required: [true],
      options: this.fb.array([]),
    });
    this.groups.push(group);
  }

  removeGroup(i: number) {
    this.groups.removeAt(i);
  }

  addOption(groupIndex: number) {
    const opts = this.groups.at(groupIndex).get('options') as FormArray;
    opts.push(
      this.fb.group({
        id_company_product: ['', Validators.required],
        extra_price: [0],
      })
    );
  }

  removeOption(groupIndex: number, optionIndex: number) {
    const opts = this.groups.at(groupIndex).get('options') as FormArray;
    opts.removeAt(optionIndex);
  }

  getOptions(groupIndex: number): FormArray {
    return this.groups.at(groupIndex).get('options') as FormArray;
  }

  async save() {
    if (this.form.invalid) {
      this.toast.error('Completa todos los campos requeridos');
      return;
    }

    const raw = this.form.value;
    const payload = {
      ...raw,
      base_price: Number(raw.base_price),
      items: raw.items.map((i: any) => ({
        id_company_product: Number(i.id_company_product),
        quantity: Number(i.quantity),
      })),
      groups: raw.groups.map((g: any) => ({
        label: g.label,
        max_selection: Number(g.max_selection),
        is_required: Boolean(g.is_required),
        options: g.options.map((o: any) => ({
          id_company_product: Number(o.id_company_product),
          extra_price: Number(o.extra_price || 0),
        })),
      })),
    };

    try {
      await this.api.update(this.data.id_combo, payload);
      this.toast.success('Combo actualizado correctamente');
      this.dialogRef.close(true);
    } catch (err) {
      console.error(err);
      this.toast.error('Error al actualizar el combo');
    }
  }
}

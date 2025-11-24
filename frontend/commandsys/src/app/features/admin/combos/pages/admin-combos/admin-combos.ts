import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormArray,
  FormGroup,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../../../shared/UI/toast.service';
import { CombosService } from '../../data-access/combos.service';
import { ProductService } from '../../../../../core/services/products/products.service';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../../shared/modals/confirm-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { ComboEditDialogComponent } from '../../UI/combo-edit-dialog/combo-edit-dialog';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-admin-combos',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatDialogModule, MatButtonModule, MatSelectModule],
  templateUrl: './admin-combos.html',
})
export class AdminCombos implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CombosService);
  private productsService = inject(ProductService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);

  combos = signal<any[]>([]);
  estado = signal<'all' | 'active' | 'inactive'>('all');
  products = signal<any[]>([]);
  loading = signal(true);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    base_price: [0, [Validators.required, Validators.min(0)]],
    items: this.fb.array([]),
    groups: this.fb.array([]),
  });

  filteredCombos = computed(() => {
    const estado = this.estado();
    const combos = this.combos();

    if (estado === 'active') {
      return combos.filter(c => c.is_active === 1 || c.is_active === true);
    } else if (estado === 'inactive') {
      return combos.filter(c => !c.is_active);
    }
    return combos; // 'all'
  });
  
  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get groups(): FormArray {
    return this.form.get('groups') as FormArray;
  }

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async ngOnInit() {
    if (!this.isBrowser) return;
    try {
      await Promise.all([this.loadCombos(), this.loadProducts()]);
    } finally {
      this.loading.set(false);
    }
  }

  async loadCombos() {
    try {
      const res = await this.api.getAll();
      this.combos.set(res.data);
    } catch {
      this.toast.error('No se pudieron cargar los combos');
    }
  }

  async loadProducts() {
    try {
      const { products } = await firstValueFrom(this.productsService.loadAll());
      this.products.set(products);
    } catch (err) {
      console.error(err);
      this.toast.error('Error al cargar productos');
    }
  }

  // -------------------
  // PRODUCTOS FIJOS
  // -------------------
  addItem() {
    this.items.push(
      this.fb.group({
        id_company_product: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
      })
    );
  }

  removeItem(index: number) {
    this.items.removeAt(index);
  }

  // -------------------
  // GRUPOS CONFIGURABLES
  // -------------------
  addGroup() {
    const group = this.fb.group({
      label: ['', Validators.required],
      max_selection: [1, [Validators.required, Validators.min(1)]],
      is_required: [true],
      options: this.fb.array([]),
    });
    this.groups.push(group);
  }

  removeGroup(index: number) {
    this.groups.removeAt(index);
  }

  addGroupOption(groupIndex: number) {
    const options = this.groups.at(groupIndex).get('options') as FormArray;
    options.push(
      this.fb.group({
        id_company_product: ['', Validators.required],
        extra_price: [0],
      })
    );
  }

  removeGroupOption(groupIndex: number, optionIndex: number) {
    const options = this.groups.at(groupIndex).get('options') as FormArray;
    options.removeAt(optionIndex);
  }

  // -------------------
  // CREAR COMBO
  // -------------------
  async createCombo() {
    if (this.form.invalid) {
      this.toast.error('Completa todos los campos requeridos');
      return;
    }

    try {
      const payload = this.form.value;
      const res = await this.api.create(payload);
      this.toast.success(res.message || 'Combo creado correctamente');

      this.form.reset();
      this.items.clear();
      this.groups.clear();
      await this.loadCombos();
    } catch (err) {
      console.error(err);
      this.toast.error('Error al crear el combo');
    }
  }

  // -------------------
  // ACCIONES
  // -------------------
  async deactivateCombo(combo: any) {
    try {
      const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
        width: '360px',
        data: {
          title: combo.is_active ? 'Desactivar combo' : 'Activar combo',
          message: combo.is_active
            ? `¿Deseas desactivar el combo "${combo.name}"?`
            : `¿Deseas activar el combo "${combo.name}"?`,
        },
      });

      const confirmed = await firstValueFrom(confirmDialog.afterClosed());
      if (!confirmed) return;

      await this.api.toggleActive(combo.id_combo);
      this.toast.success(
        combo.is_active
          ? 'Combo desactivado correctamente'
          : 'Combo activado correctamente'
      );

      await this.loadCombos();
    } catch (err) {
      console.error(err);
      this.toast.error('Error al modificar el combo');
    }
  }

  getOptions(groupIndex: number): FormArray {
    return this.groups.at(groupIndex).get('options') as FormArray;
  }

  editCombo(combo: any) {
    const dialogRef = this.dialog.open(ComboEditDialogComponent, {
      width: '900px',         
      maxHeight: '90vh',       
      data: combo,
      panelClass: 'rounded-modal',
    });

    dialogRef.afterClosed().subscribe(async (updated) => {
      if (updated) {
        await this.loadCombos();
      }
    });
  }

}

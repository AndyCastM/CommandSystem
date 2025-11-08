import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../../../shared/UI/toast.service';
import { CombosService } from '../../data-access/combos.service';
import { ProductService } from '../../../../../core/services/products/products.service'; // Para listar productos disponibles
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-combos',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatDialogModule],
  templateUrl: './admin-combos.html',
})
export class AdminCombos implements OnInit{

  private fb = inject(FormBuilder);
  private api = inject(CombosService);
  private productsService = inject(ProductService);
  private toast = inject(ToastService);

  combos = signal<any[]>([]);
  products = signal<any[]>([]);
  loading = signal(true);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    base_price: [0, Validators.required],
    items: this.fb.array([]),
  });

  get items() {
    return this.form.get('items') as FormArray;
  }

  async ngOnInit() {
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

  async createCombo() {
    if (this.form.invalid) {
      this.toast.error('Completa todos los campos requeridos');
      return;
    }

    try {
      const res = await this.api.create(this.form.value);
      this.toast.success(res.message || 'Combo creado');
      this.form.reset();
      this.items.clear();
      await this.loadCombos();
    } catch (err) {
      console.error(err);
      this.toast.error('Error al crear el combo');
    }
  }

  async deactivateCombo(combo: any) {
    try {
      const confirmMsg = combo.is_active
        ? `¿Deseas desactivar el combo "${combo.name}"?`
        : `¿Deseas eliminar el combo "${combo.name}" permanentemente?`;

      if (!confirm(confirmMsg)) return;

      //await this.api.delete(combo.id_combo); 
      this.toast.success(
        combo.is_active ? 'Combo desactivado correctamente' : 'Combo eliminado'
      );
      await this.loadCombos();
    } catch (err) {
      console.error(err);
      this.toast.error('Error al modificar el combo');
    }
  }

  editCombo(combo: any) {
    // abrir un modal o navegar a una pantalla de edición
    console.log('Editar combo:', combo);
    this.toast.info(`Modo edición para "${combo.name}" (en construcción)`);
  }

 }

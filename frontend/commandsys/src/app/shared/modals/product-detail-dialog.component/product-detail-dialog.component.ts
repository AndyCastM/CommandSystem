import { Component, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../shared/UI/toast.service';
import { ProductService } from '../../../core/services/products/products.service';

@Component({
  selector: 'app-product-detail-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './product-detail-dialog.component.html',
  styleUrl: './product-detail-dialog.component.css',
})
export class ProductDetailDialogComponent implements OnInit {
  product = signal<any>(null);
  loading = signal(true);
  selectedOptions = new Map<number, any>(); // id_option -> selected value(s)
  quantity = signal(1);
  isAdding: boolean = false;  // Determina si estamos en modo agregar o solo ver
  orderNotes: string = '';    // Para almacenar las notas del usuario

  constructor(
    private productsApi: ProductService,
    private toast: ToastService,
    private dialogRef: MatDialogRef<ProductDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      id_company_product: number, 
      isAdding: boolean // Recibimos el parámetro isAdding desde el componente padre
    }
  ) {}

  async ngOnInit() {
    this.isAdding = this.data.isAdding;
    console.log('Modo isAdding en diálogo:', this.isAdding);
    try {
      const res = await this.productsApi.getDetail(this.data.id_company_product);
      this.product.set(res.data);
    } catch (err) {
      this.toast.error('No se pudo cargar el detalle del producto');
      this.dialogRef.close();
    } finally {
      this.loading.set(false);
    }
  }

  toggleValue(option: any, value: any) {
    const existing = this.selectedOptions.get(option.id_option);

    if (option.multi_select) {
      const values = existing ? [...existing] : [];
      const index = values.findIndex((v) => v.id_value === value.id_value);
      if (index >= 0) values.splice(index, 1);
      else values.push(value);
      this.selectedOptions.set(option.id_option, values);
    } else {
      this.selectedOptions.set(option.id_option, [value]);
    }
  }

  isSelected(optionId: number, valueId: number): boolean {
    const selected = this.selectedOptions.get(optionId);
    return selected?.some((v: { id_value: number }) => v.id_value === valueId) ?? false;
  }

  increaseQty() {
    this.quantity.set(this.quantity() + 1);
  }

  decreaseQty() {
    if (this.quantity() > 1) this.quantity.set(this.quantity() - 1);
  }

  // Agregar producto solo si estamos en modo agregar
  addToOrder() {
    if (!this.isAdding) {
      this.toast.error('No puedes agregar productos, solo estás visualizando el producto.');
      return;
    }

    if (!this.isValidSelection()) {
      this.toast.error('Selecciona todas las opciones obligatorias');
      return;
    }
    
    // Obtenemos el producto actual para buscar los tiers originales
    const productData = this.product();

    const selected = Array.from(this.selectedOptions.entries()).map(([id_option, selectedValues]) => {
      // Buscamos la opción original en el producto para recuperar sus tiers y flags
      const originalOption = productData.options.find((o: any) => o.id_option === id_option);

      return {
        id_option,
        name: originalOption?.name, // Útil para el resumen
        multi_select: originalOption?.multi_select, // ¡Indispensable!
        // Recuperamos los tiers de la base de datos (asegúrate del nombre de la propiedad según tu API)
        tiers: originalOption?.product_option_tiers || originalOption?.tiers || [], 
        values: selectedValues.map((v: any) => ({
          id_option_value: v.id_value,
          name: v.name,
          extra_price: v.extra_price,
        })),
      };
    });

    // Devolver los datos al padre
    this.dialogRef.close({
      product: productData,
      quantity: this.quantity(),
      options: selected,
      notes: this.orderNotes,
    });
  }

  // Regresa true si TODAS las opciones obligatorias están seleccionadas
  isValidSelection(): boolean {
    const product = this.product();
    if (!product) return false;

    for (const opt of product.options) {
      if (opt.is_required) {
        const selected = (this.selectedOptions.get(opt.id_option) ?? []) as any[];
        if (!selected.length) return false;
      }
    }

    return true;
  }

  close() {
    this.dialogRef.close();
  }
}

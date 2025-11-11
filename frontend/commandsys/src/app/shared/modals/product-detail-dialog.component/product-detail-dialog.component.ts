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

  constructor(
    private productsApi: ProductService,
    private toast: ToastService,
    private dialogRef: MatDialogRef<ProductDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id_company_product: number }
  ) {}

  async ngOnInit() {
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

  addToOrder() {
    const selected = Array.from(this.selectedOptions.entries()).map(([id_option, values]) => ({
      id_option,
      values: values.map((v: any) => ({
        id_option_value: v.id_value,
        name: v.name,
        extra_price: v.extra_price,
      })),
    }));

    this.dialogRef.close({
      product: this.product(),
      quantity: this.quantity(),
      options: selected,
    });
  }

  close() {
    this.dialogRef.close();
  }
}

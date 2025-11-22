import { Component, Inject, signal, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

export interface OrderConfirmResult {
  customer_name: string | null;
}

@Component({
  selector: 'app-order-confirm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIcon],
  templateUrl: './order-confirm.modal.html',
})
export class OrderConfirmModal {
  customer_name = signal('');
  shake = signal(false);

  constructor(
    private dialogRef: MatDialogRef<OrderConfirmModal>,
    @Inject(MAT_DIALOG_DATA)
    public data: { orderType: string; kitchenPreview: any[] }
  ) {}

  close() {
    this.dialogRef.close(null);
  }

  confirm() {
    if (this.data.orderType === 'takeout' && !this.customer_name().trim()) {
      this.shake.set(true);
      setTimeout(() => this.shake.set(false), 500);
      return;
    }

    this.dialogRef.close({
      customer_name:
        this.data.orderType === 'takeout'
          ? this.customer_name().trim()
          : null,
    } as OrderConfirmResult);
  }

  formatPrice(n: number) {
    return '$' + Number(n).toFixed(2);
  }
}

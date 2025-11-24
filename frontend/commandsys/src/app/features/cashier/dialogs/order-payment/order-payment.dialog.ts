import { Component, Inject, signal, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-payment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-payment.dialog.html'
})
export class OrderPaymentDialog {
    // Datos que enviamos desde el componente que cobra
    total!: number;
    orderId!: number;

    // Signals
    method = signal<'cash' | 'card' | 'transfer'>('cash');
    amountPaid = signal<number>(0);
    tip = signal<number>(0);

    // Cambio automático solo si es efectivo
    change = computed(() =>
        this.method() === 'cash'
        ? Math.max(0, Number(this.amountPaid()) - Number(this.total))
        : 0
    );

    constructor(
        private ref: MatDialogRef<OrderPaymentDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.total = data.total;
        this.orderId = data.id_order;
        this.amountPaid.set(data.total); 
    }   

    confirm() {
        if (this.amountPaid() < this.total && this.method() === 'cash') {
        alert('El efectivo no cubre el total.');
        return;
        }

        this.ref.close({
        id_order: this.orderId,
        method: this.method(),
        amount: this.amountPaid(),
        tip: this.tip(),
        });
    }

    cancel() {
        this.ref.close(null);
    }
}

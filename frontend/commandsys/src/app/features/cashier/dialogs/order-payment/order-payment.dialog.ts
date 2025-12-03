import { Component, Inject, signal, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-payment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-payment.dialog.html',
})
export class OrderPaymentDialog {
  // Datos que enviamos desde el componente que cobra
  total!: number;

  // Puede venir por orden o por sesión
  orderId?: number;
  idSession?: number;
  idOrders?: number[];
  table?: string;

  // Signals de montos por método
  cashAmount = signal(0);       // efectivo
  cardAmount = signal(0);       // tarjeta
  transferAmount = signal(0);   // transferencia

  // Total pagado = suma de los 3 métodos
  totalPaid = computed(() =>
    (this.cashAmount() || 0) +
    (this.cardAmount() || 0) +
    (this.transferAmount() || 0)
  );

  // Restante (si pagaron menos que el total)
  remaining = computed(() =>
    Math.max(0, (this.total || 0) - this.totalPaid())
  );

  // Cambio (si se pasaron del total)
  change = computed(() =>
    Math.max(0, this.totalPaid() - (this.total || 0))
  );

  validateAmounts() {
    if (this.cashAmount() < 0) this.cashAmount.set(0);
    if (this.cardAmount() < 0) this.cardAmount.set(0);
    if (this.transferAmount() < 0) this.transferAmount.set(0);
  }

  constructor(
    private ref: MatDialogRef<OrderPaymentDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.total = data.total;
    this.orderId = data.id_order;      // si viene por orden
    this.idSession = data.id_session;  // si viene por sesión
    this.idOrders = data.id_orders;    // array de órdenes (sesión)
    this.table = data.table;           // mesa (opcional)

    // Default: que todo vaya a efectivo al abrir el modal
    this.cashAmount.set(this.total ?? 0);
  }

  confirm() {
    // Validación de negativos
    if (
      this.cashAmount() < 0 ||
      this.cardAmount() < 0 ||
      this.transferAmount() < 0
    ) {
      alert("Los montos no pueden ser negativos.");
      return;
    }

    // Deben pagar AL MENOS algo
    if (this.totalPaid() <= 0) {
      alert('Debes ingresar un monto válido.');
      return;
    }

    // No permitir pasarse del total
    if (this.totalPaid() > (this.total || 0)) {
      alert('La suma de los métodos no puede exceder el total.');
      return;
    }

    // (Opcional) No permitir pagar menos del total
    // if (this.totalPaid() < (this.total || 0)) {
    //   alert('El pago no cubre el total.');
    //   return;
    // }

    // Construir array final de pagos
    const payments: { method: 'cash' | 'card' | 'transfer'; amount: number }[] = [];

    if (this.cashAmount() > 0) {
      payments.push({ method: 'cash', amount: this.cashAmount() });
    }
    if (this.cardAmount() > 0) {
      payments.push({ method: 'card', amount: this.cardAmount() });
    }
    if (this.transferAmount() > 0) {
      payments.push({ method: 'transfer', amount: this.transferAmount() });
    }

    this.ref.close({
      id_order: this.orderId,
      id_session: this.idSession,
      id_orders: this.idOrders,
      payments,
    });
  }

  cancel() {
    this.ref.close(null);
  }
}

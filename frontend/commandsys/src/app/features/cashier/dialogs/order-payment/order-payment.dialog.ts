import { Component, Inject, signal, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../shared/UI/toast.service';

@Component({
  selector: 'app-order-payment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-payment.dialog.html',
})
export class OrderPaymentDialog {
  // Datos que enviamos desde el componente que cobra
  total!: number;

  private toast = inject(ToastService);

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
    const total = this.total || 0;
    const paid = this.totalPaid();
    const epsilon = 0.01; // Para evitar errores de decimales

    // Validar negativos
    if (this.cashAmount() < 0 || this.cardAmount() < 0 || this.transferAmount() < 0) {
      this.toast.error("Los montos no pueden ser negativos.");
      return;
    }

    //  Validar que no esté vacío
    if (paid <= 0) {
      this.toast.error('Debes ingresar un monto válido.');
      return;
    }

    // No permitimos que Tarjeta o Transferencia solas excedan el total
    if ((this.cardAmount() + this.transferAmount()) > total + epsilon) {
      this.toast.error('El monto en tarjeta/transferencia no puede exceder el total.');
      return;
    }

    //  VALIDAR QUE CUBRA EL TOTAL
    if (paid < total - epsilon) {
      this.toast.error(`El pago no cubre el total. Faltan ${(total - paid)}`);
      return;
    }

    const payments: { method: 'cash' | 'card' | 'transfer'; amount: number }[] = [];

    // se guarda el monto REAL recibido.
    if (this.cashAmount() > 0) payments.push({ method: 'cash', amount: this.cashAmount() });
    if (this.cardAmount() > 0) payments.push({ method: 'card', amount: this.cardAmount() });
    if (this.transferAmount() > 0) payments.push({ method: 'transfer', amount: this.transferAmount() });

    this.ref.close({
      id_order: this.orderId,
      id_session: this.idSession,
      id_orders: this.idOrders,
      payments,
      change: this.change() // Enviamos el cambio calculado para el ticket
    });
  }

  cancel() {
    this.ref.close(null);
  }
}

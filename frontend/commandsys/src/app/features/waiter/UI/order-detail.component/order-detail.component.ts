import { Component, Inject, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../shared/UI/toast.service';
import { OrderService } from '../../../../core/services/orders/orders.service';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-order-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIcon],
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent {
  private ordersApi = inject(OrderService);
  private toast = inject(ToastService);

  loadingCancel = false;
  loadingOrderCancel = false;

  reason: string = '';
  cancelTarget: any = null; // item a cancelar
  cancelQty = 1;

  orderReason : string = ''
  constructor(
    private dialogRef: MatDialogRef<OrderDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { order: any }
  ) {}

  /** Cerrar modal */
  close() {
    this.dialogRef.close();
  }

  /** Abrir modo cancelar item */
  startCancelItem(item: any) {
    this.cancelTarget = item;
    this.reason = '';
  }

  /** Cancelación individual */
  async confirmCancelItem() {
    if (!this.reason.trim()) {
      this.toast.warning('Debes ingresar un motivo');
      return;
    }

    this.loadingCancel = true;
    try {
      await this.ordersApi.cancelItem(this.cancelTarget.id_order_item, this.reason, this.cancelQty);
      this.toast.success('Producto cancelado');
      this.dialogRef.close('updated');
    } catch (err: any) {
      console.error(err);
      this.toast.error('Error al cancelar item');
    } finally {
      this.loadingCancel = false;
    }
  }

  /** Cancelar comanda completa */
  async cancelOrder() {
    if (!confirm('¿Cancelar toda la comanda? Esto no se puede deshacer.')) return;

    this.loadingOrderCancel = true;

    try {
      await this.ordersApi.cancelOrder(this.data.order.id, this.orderReason);
      this.toast.success('Comanda cancelada');
      this.dialogRef.close('updated');
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo cancelar la comanda');
    } finally {
      this.loadingOrderCancel = false;
    }
  }
}

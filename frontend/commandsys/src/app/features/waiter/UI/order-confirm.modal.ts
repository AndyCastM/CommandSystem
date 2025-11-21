import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

export type OrderType = 'dine_in' | 'takeout';

export interface OrderConfirmData {
  orderType: OrderType;
}

export interface OrderConfirmResult {
  customer_name: string | null;
}

@Component({
  selector: 'app-order-confirm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-1">
      <h2 class="text-lg font-semibold mb-4">
        🧾 Confirmar comanda
      </h2>

      <!-- PARA LLEVAR -->
      <ng-container *ngIf="data.orderType === 'takeout'; else dineInTpl">
        <p class="text-sm text-slate-600 mb-3">
          Esta orden es <strong>para llevar</strong>. Ingresa el nombre del cliente:
        </p>

        <input
          type="text"
          [(ngModel)]="customerName"
          class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Nombre del cliente"
        />

        <p *ngIf="error" class="text-xs text-red-600 mt-1">
          {{ error }}
        </p>
      </ng-container>

      <!-- MESA -->
      <ng-template #dineInTpl>
        <p class="text-sm text-slate-600">
          La comanda será guardada para <strong>esta mesa</strong>.
        </p>
      </ng-template>

      <div class="flex justify-end gap-3 mt-6">
        <button
          type="button"
          (click)="onCancel()"
          class="px-4 py-2 rounded-lg border border-slate-300 text-sm"
        >
          Cancelar
        </button>

        <button
          type="button"
          (click)="onConfirm()"
          class="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm"
        >
          Confirmar
        </button>
      </div>
    </div>
  `,
})
export class OrderConfirmModal {
  customerName = '';
  error: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<OrderConfirmModal, OrderConfirmResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: OrderConfirmData
  ) {}

  onCancel() {
    this.dialogRef.close(null);
  }

  onConfirm() {
    if (this.data.orderType === 'takeout') {
      const name = (this.customerName || '').trim();
      if (!name) {
        this.error = 'El nombre del cliente es obligatorio.';
        return;
      }
      this.dialogRef.close({ customer_name: name });
      return;
    }

    // dine_in → no requiere nombre
    this.dialogRef.close({ customer_name: null });
  }
}

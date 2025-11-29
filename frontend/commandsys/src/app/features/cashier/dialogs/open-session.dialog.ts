import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-open-session-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <mat-icon fontIcon="point_of_sale" class="!text-[22px] !w-[22px] !h-[22px] text-emerald-600"></mat-icon>
        </div>
        <div>
          <h2 class="text-xl font-semibold text-slate-800">Abrir turno de caja</h2>
        </div>
      </div>
      <p class="text-sm text-slate-500">Registra el monto inicial en efectivo</p>
    </div>

    <!-- Info -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-start gap-2">
      <mat-icon fontIcon="info" class="!text-[18px] !w-[18px] !h-[18px] text-blue-600 mt-0.5 flex-shrink-0"></mat-icon>
      <p class="text-xs text-blue-800">
        Es el efectivo con el que cuentas al inicio del turno (billetes y monedas en caja).
      </p>
    </div>

    <!-- Input de monto -->
    <div class="mb-6">
      <label class="text-sm font-medium text-slate-700 mb-2 block">
        Monto inicial en efectivo
      </label>
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
          $
        </span>
        <input 
          type="number"
          [(ngModel)]="amount"
          placeholder="0.00"
          min="0"
          step="0.01"
          class="w-full border-2 border-slate-300 rounded-lg pl-9 pr-4 py-3 text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
        />
      </div>
    </div>

    <!-- Resumen -->
    <div class="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-6">
      <div class="flex items-center justify-between">
        <span class="text-sm text-slate-600">Monto a registrar:</span>
        <span class="text-xl font-bold text-emerald-600">
          {{ amount || 0 | currency: 'MXN' : 'symbol' : '1.2-2' }}
        </span>
      </div>
    </div>

    <!-- Botones -->
    <div class="flex gap-3">
      <button 
        mat-dialog-close 
        class="flex-1 px-4 py-2.5 rounded-lg border-2 border-slate-300 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 transition-all"
      >
        Cancelar
      </button>
      <button 
        (click)="confirm()" 
        [disabled]="!amount || amount < 0"
        class="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <mat-icon fontIcon="check_circle" class="!text-[18px] !w-[18px] !h-[18px]"></mat-icon>
        <span>Abrir turno</span>
      </button>
    </div>
  </div>
  `
})
export class OpenSessionDialog {
  amount: number = 0;

  constructor(private dialogRef: MatDialogRef<OpenSessionDialog>) {}

  confirm() {
    if (this.amount && this.amount >= 0) {
      this.dialogRef.close(this.amount);
    }
  }
}
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
  <div class="p-2">
    <!-- Header con gradiente -->
    <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 rounded-2xl mb-6">
      <div class="flex items-center gap-3">
        <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <mat-icon fontIcon="point_of_sale" class="!text-[28px] !w-[28px] !h-[28px] text-white"></mat-icon>
        </div>
        <div>
          <h2 class="text-2xl font-bold text-white">Abrir turno de caja</h2>
          <p class="text-emerald-100 text-sm">Registra el monto inicial en efectivo</p>
        </div>
      </div>
    </div>

    <!-- Contenido -->
    <div class="px-2">
      <!-- Información -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <mat-icon fontIcon="info" class="!text-[20px] !w-[20px] !h-[20px] text-blue-600 mt-0.5"></mat-icon>
        <div class="flex-1">
          <p class="text-sm text-blue-900 font-medium">¿Qué es el monto inicial?</p>
          <p class="text-xs text-blue-700 mt-1">
            Es el efectivo con el que cuentas al inicio del turno (billetes y monedas en caja).
          </p>
        </div>
      </div>

      <!-- Input de monto -->
      <div class="mb-6">
        <label class="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <mat-icon fontIcon="attach_money" class="!text-[18px] !w-[18px] !h-[18px] text-emerald-600"></mat-icon>
          <span>Monto inicial en efectivo</span>
        </label>
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-semibold">
            $
          </span>
          <input 
            type="number"
            [(ngModel)]="amount"
            placeholder="0.00"
            min="0"
            step="0.01"
            class="w-full border-2 border-slate-300 rounded-xl pl-10 pr-4 py-3.5 text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
            MXN
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
          <mat-icon fontIcon="lightbulb" class="!text-[14px] !w-[14px] !h-[14px]"></mat-icon>
          <span>Tip: Cuenta el efectivo antes de abrir la caja</span>
        </p>
      </div>

      <!-- Resumen visual -->
      <div class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 mb-6">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-600 font-medium">Monto a registrar:</span>
          <span class="text-2xl font-bold text-emerald-600">
            {{ amount || 0 | currency: 'MXN' : 'symbol' : '1.2-2' }}
          </span>
        </div>
      </div>

      <!-- Botones -->
      <div class="flex gap-3 pb-2">
        <button 
          mat-dialog-close 
          class="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 transition-all"
        >
          Cancelar
        </button>
        <button 
          (click)="confirm()" 
          [disabled]="!amount || amount < 0"
          class="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium shadow-lg shadow-emerald-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
        >
          <mat-icon fontIcon="check_circle" class="!text-[20px] !w-[20px] !h-[20px]"></mat-icon>
          <span>Abrir turno</span>
        </button>
      </div>
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
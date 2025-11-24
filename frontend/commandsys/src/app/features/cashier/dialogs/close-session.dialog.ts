import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-close-session-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule], // ← Agrega MatDialogModule
  template: `
  <div class="p-2">
    <!-- Header con gradiente rojo -->
    <div class="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-5 rounded-2xl mb-6">
      <div class="flex items-center gap-3">
        <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <mat-icon fontIcon="lock" class="!text-[28px] !w-[28px] !h-[28px] text-white"></mat-icon>
        </div>
        <div>
          <h2 class="text-2xl font-bold text-white">Cerrar turno de caja</h2>
          <p class="text-rose-100 text-sm">Realiza el corte de caja y cierra el turno</p>
        </div>
      </div>
    </div>

    <!-- Contenido -->
    <div class="px-2">
      <!-- Total esperado -->
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <mat-icon fontIcon="calculate" class="!text-[24px] !w-[24px] !h-[24px] text-white"></mat-icon>
            </div>
            <div>
              <p class="text-sm text-blue-700 font-medium">Total esperado</p>
              <p class="text-xs text-blue-600 mt-0.5">Según ventas registradas</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-3xl font-bold text-blue-900">
              {{ data.totals.expected | currency: 'MXN' : 'symbol' : '1.2-2' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Input de monto contado -->
      <div class="mb-6">
        <label class="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <mat-icon fontIcon="payments" class="!text-[18px] !w-[18px] !h-[18px] text-rose-600"></mat-icon>
          <span>Monto contado en caja</span>
        </label>
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-semibold">
            $
          </span>
          <input 
            type="number"
            [(ngModel)]="counted"
            placeholder="0.00"
            min="0"
            step="0.01"
            class="w-full border-2 border-slate-300 rounded-xl pl-10 pr-4 py-3.5 text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
            MXN
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
          <mat-icon fontIcon="info" class="!text-[14px] !w-[14px] !h-[14px]"></mat-icon>
          <span>Cuenta todo el efectivo físico en la caja</span>
        </p>
      </div>

      <!-- Diferencia (solo si hay monto ingresado) -->
      <div 
        *ngIf="counted > 0" 
        class="rounded-xl p-4 mb-6 border-2 transition-all"
        [ngClass]="{
          'bg-green-50 border-green-300': difference === 0,
          'bg-yellow-50 border-yellow-300': difference !== 0 && Math.abs(difference) <= 50,
          'bg-red-50 border-red-300': Math.abs(difference) > 50
        }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon 
              [fontIcon]="difference === 0 ? 'check_circle' : difference > 0 ? 'trending_up' : 'trending_down'"
              [ngClass]="{
                'text-green-600': difference === 0,
                'text-yellow-600': difference !== 0 && Math.abs(difference) <= 50,
                'text-red-600': Math.abs(difference) > 50
              }"
              class="!text-[24px] !w-[24px] !h-[24px]"
            ></mat-icon>
            <div>
              <p class="text-sm font-semibold"
                [ngClass]="{
                  'text-green-900': difference === 0,
                  'text-yellow-900': difference !== 0 && Math.abs(difference) <= 50,
                  'text-red-900': Math.abs(difference) > 50
                }"
              >
                {{ difference === 0 ? 'Cuadra perfecto' : difference > 0 ? 'Sobrante' : 'Faltante' }}
              </p>
              <p class="text-xs"
                [ngClass]="{
                  'text-green-700': difference === 0,
                  'text-yellow-700': difference !== 0 && Math.abs(difference) <= 50,
                  'text-red-700': Math.abs(difference) > 50
                }"
              >
                {{ difference === 0 ? 'El monto coincide exactamente' : 'Verifica el conteo' }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold"
              [ngClass]="{
                'text-green-600': difference === 0,
                'text-yellow-600': difference !== 0 && Math.abs(difference) <= 50,
                'text-red-600': Math.abs(difference) > 50
              }"
            >
              {{ difference > 0 ? '+' : '' }}{{ difference | currency: 'MXN' : 'symbol' : '1.2-2' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Advertencia si no ha ingresado monto -->
      <div *ngIf="counted === 0" class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <mat-icon fontIcon="warning" class="!text-[20px] !w-[20px] !h-[20px] text-amber-600 mt-0.5"></mat-icon>
        <div class="flex-1">
          <p class="text-sm text-amber-900 font-medium">Ingresa el monto contado</p>
          <p class="text-xs text-amber-700 mt-1">
            Necesitas contar el efectivo en caja antes de cerrar el turno
          </p>
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
          [disabled]="counted === 0"
          class="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-white font-medium shadow-lg shadow-rose-200 hover:from-rose-700 hover:to-rose-800 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
        >
          <mat-icon fontIcon="lock" class="!text-[20px] !w-[20px] !h-[20px]"></mat-icon>
          <span>Cerrar turno</span>
        </button>
      </div>
    </div>
  </div>
  `
})
export class CloseSessionDialog {
  counted: number = 0;

  constructor(
    private dialogRef: MatDialogRef<CloseSessionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  get difference(): number {
    return this.counted - this.data.totals.expected;
  }

  get Math() {
    return Math;
  }

  confirm() {
    if (this.counted > 0) {
      this.dialogRef.close(this.counted);
    }
  }
}
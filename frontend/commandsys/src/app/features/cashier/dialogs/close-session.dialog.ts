import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface CloseSessionTotals {
  cash: number;
  card: number;
  transfer: number;
  tips: number;
  sales: number;
  expectedCash: number; // efectivo esperado en caja = fondo + ventas en cash
}

@Component({
  selector: 'app-close-session-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <mat-icon fontIcon="lock" class="!text-[22px] !w-[22px] !h-[22px] text-rose-600"></mat-icon>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-slate-800">Cerrar turno de caja</h2>
          </div>
        </div>
        <p class="text-sm text-slate-500">Realiza el corte de caja y confirma el efectivo</p>
      </div>

      <!-- Total esperado -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-blue-700 font-medium">Efectivo esperado en caja</p>
            <p class="text-xs text-blue-600 mt-0.5">Fondo inicial + ventas en efectivo</p>
          </div>
          <p class="text-2xl font-bold text-blue-900">
            {{ data.totals.expectedCash | currency : 'MXN' : 'symbol' : '1.2-2' }}
          </p>
        </div>
      </div>

      <!-- Monto contado -->
      <div class="mb-6">
        <label class="text-sm font-medium text-slate-700 mb-2 block">
          Efectivo contado en caja
        </label>
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
            $
          </span>
          <input
            type="number"
            [(ngModel)]="counted"
            placeholder="0.00"
            min="0"
            step="0.01"
            class="w-full border-2 border-slate-300 rounded-lg pl-9 pr-4 py-3 text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
          />
        </div>
        <p class="text-xs text-slate-500 mt-2">
          Cuenta solo el efectivo físico dentro de la caja
        </p>
      </div>

      <!-- Diferencia -->
      <div
        *ngIf="counted > 0"
        class="rounded-lg p-4 mb-6 border-2 transition-all"
        [ngClass]="{
          'bg-green-50 border-green-300': differenceStatus === 'ok',
          'bg-yellow-50 border-yellow-300': differenceStatus === 'warn',
          'bg-red-50 border-red-300': differenceStatus === 'bad'
        }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon
              [fontIcon]="
                differenceStatus === 'ok'
                  ? 'check_circle'
                  : difference > 0
                  ? 'trending_up'
                  : 'trending_down'
              "
              [ngClass]="{
                'text-green-600': differenceStatus === 'ok',
                'text-yellow-600': differenceStatus === 'warn',
                'text-red-600': differenceStatus === 'bad'
              }"
              class="!text-[20px] !w-[20px] !h-[20px]"
            ></mat-icon>

            <div>
              <p
                class="text-sm font-semibold"
                [ngClass]="{
                  'text-green-900': differenceStatus === 'ok',
                  'text-yellow-900': differenceStatus === 'warn',
                  'text-red-900': differenceStatus === 'bad'
                }"
              >
                {{
                  differenceStatus === 'ok'
                    ? 'Cuadra perfecto'
                    : difference > 0
                    ? 'Sobrante'
                    : 'Faltante'
                }}
              </p>
              <p
                class="text-xs"
                [ngClass]="{
                  'text-green-700': differenceStatus === 'ok',
                  'text-yellow-700': differenceStatus === 'warn',
                  'text-red-700': differenceStatus === 'bad'
                }"
              >
                {{
                  differenceStatus === 'ok'
                    ? 'El monto coincide exactamente'
                    : 'Revisa el conteo o registra la incidencia'
                }}
              </p>
            </div>
          </div>

          <p
            class="text-xl font-bold"
            [ngClass]="{
              'text-green-600': differenceStatus === 'ok',
              'text-yellow-600': differenceStatus === 'warn',
              'text-red-600': differenceStatus === 'bad'
            }"
          >
            {{ difference > 0 ? '+' : '' }}
            {{ difference | currency : 'MXN' : 'symbol' : '1.2-2' }}
          </p>
        </div>
      </div>

      <!-- Advertencia -->
      <div
        *ngIf="counted === 0"
        class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-2"
      >
        <mat-icon
          fontIcon="warning"
          class="!text-[18px] !w-[18px] !h-[18px] text-amber-600 mt-0.5 flex-shrink-0"
        ></mat-icon>
        <div>
          <p class="text-sm text-amber-900 font-medium">Ingresa el monto contado</p>
          <p class="text-xs text-amber-700 mt-0.5">
            Necesitas contar el efectivo antes de cerrar el turno
          </p>
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
          [disabled]="counted === 0"
          class="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <mat-icon fontIcon="lock" class="!text-[18px] !w-[18px] !h-[18px]"></mat-icon>
          <span>Cerrar turno</span>
        </button>
      </div>
    </div>
  `,
})
export class CloseSessionDialog {
  counted = 0;

  constructor(
    private dialogRef: MatDialogRef<CloseSessionDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: { totals: CloseSessionTotals }
  ) {}

  /** Diferencia = contado - esperadoEnEfectivo */
  get difference(): number {
    return (this.counted || 0) - (this.data.totals.expectedCash || 0);
  }

  /** Clasificación visual de la diferencia */
  get differenceStatus(): 'ok' | 'warn' | 'bad' {
    const abs = Math.abs(this.difference);
    if (abs === 0) return 'ok';
    if (abs <= 50) return 'warn'; // tolerancia chica
    return 'bad';
  }

  confirm() {
    if (this.counted > 0) {
      // devolvemos el monto contado al componente padre
      this.dialogRef.close(this.counted);
    }
  }
}
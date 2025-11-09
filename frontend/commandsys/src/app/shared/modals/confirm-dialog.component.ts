import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-6 text-center">
      <h2 class="text-lg font-semibold text-slate-800 mb-2">
        {{ data.title || 'Confirmar acción' }}
      </h2>
      <p class="text-slate-600 text-sm mb-6">{{ data.message }}</p>

      <div class="flex justify-center gap-3">
        <button (click)="dialogRef.close(false)"
          class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition">
          Cancelar
        </button>

        <button (click)="dialogRef.close(true)"
          class="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-sky-600 text-white hover:opacity-90 transition">
          Confirmar
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ConfirmDialogComponent>
  ) {}
}

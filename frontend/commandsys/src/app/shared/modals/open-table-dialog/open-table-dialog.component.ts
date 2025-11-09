import { Component, Inject, inject} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon, MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-open-table-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule],
  template: `
    <div
      class="bg-white rounded-2xl shadow-xl w-full sm:w-[420px] max-w-[92vw] overflow-hidden"
    >
      <!-- Header -->
      <div
        class="p-5 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-sky-50 flex items-center justify-between"
      >
        <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <mat-icon class="text-sky-600">table_restaurant</mat-icon>
          Abrir Mesa {{ data.table.name }}
        </h2>
        <button
          type="button"
          (click)="cancel()"
          class="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Body -->
      <form
        [formGroup]="form"
        (ngSubmit)="confirm()"
        class="flex flex-col justify-between flex-1"
      >
        <div class="p-5 space-y-4">
          <p class="text-slate-500 text-sm">
            Capacidad máxima: 
            <span class="font-semibold text-slate-700">
              {{ data.table.seats }} personas
            </span>
          </p>

          <div>
            <label class="text-sm font-semibold text-slate-700">
              Número de comensales
            </label>
            <input
              type="number"
              min="1"
              [max]="data.table.seats"
              formControlName="guests"
              class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-200 focus:border-sky-300 outline-none transition-all"
            />
            <div
              *ngIf="form.get('guests')?.invalid && form.get('guests')?.touched"
              class="text-xs text-red-500 mt-1"
            >
              Debe ingresar entre 1 y {{ data.table.seats }} comensales
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t bg-white flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            (click)="cancel()"
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="px-5 py-2 rounded-xl text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60"
            [disabled]="form.invalid"
          >
            <mat-icon>check_circle</mat-icon>
            Abrir Mesa
          </button>
        </div>
      </form>
    </div>
  `,
})
export class OpenTableDialogComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    guests: [null, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private ref: MatDialogRef<OpenTableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  confirm() {
    const guests = this.form.value.guests;
    if (guests && guests <= this.data.table.seats) {
      this.ref.close(guests);
    }
  }

  cancel() {
    this.ref.close();
  }
}

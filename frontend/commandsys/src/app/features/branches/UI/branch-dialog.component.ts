import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, Form, FormGroup } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';

import { Branch } from '../data-access/branches.models';

type DialogMode = 'create' | 'edit';
type DialogData = { mode: DialogMode; value?: Branch };

@Component({
  selector: 'app-branch-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
  ],
  template: `
  <h2 mat-dialog-title class="text-[#1f3b6f] font-semibold">
    {{ data.mode === 'create' ? 'Nueva Sucursal' : 'Editar Sucursal' }}
  </h2>

  <form class="grid grid-cols-1 md:grid-cols-2 gap-4 p-1" (ngSubmit)="submit()"
        [formGroup]="form" autocomplete="off">

    <mat-form-field appearance="outline" class="md:col-span-2">
      <mat-label>Nombre</mat-label>
      <input matInput formControlName="name" required />
    </mat-form-field>

    <mat-form-field appearance="outline" class="md:col-span-2">
      <mat-label>Calle</mat-label>
      <input matInput formControlName="street" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Colonia</mat-label>
      <input matInput formControlName="suburb" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Número</mat-label>
      <input matInput formControlName="num_ext" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Ciudad</mat-label>
      <input matInput formControlName="city" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Estado</mat-label>
      <input matInput formControlName="state" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Código Postal</mat-label>
      <input matInput formControlName="zip" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Teléfono</mat-label>
      <input matInput formControlName="phone" />
    </mat-form-field>

    <mat-form-field appearance="outline" class="md:col-span-2">
      <mat-label>Email</mat-label>
      <input matInput type="email" formControlName="email" />
    </mat-form-field>

    <div class="md:col-span-2">
      <mat-slide-toggle color="primary" formControlName="is_active">
        Activa
      </mat-slide-toggle>
    </div>

    <div class="md:col-span-2 flex justify-end gap-2 pt-2">
      <button mat-stroked-button type="button" (click)="close()">Cancelar</button>
      <button mat-raised-button color="primary"
              class="!bg-[#16a3bd] hover:!bg-[#117e91] text-white"
              [disabled]="form.invalid" type="submit">
        Guardar
      </button>
    </div>
  </form>
  `,
})
export class BranchDialogComponent {
  private fb = inject(FormBuilder);
  form! : FormGroup;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private ref: MatDialogRef<BranchDialogComponent>
  ) {
    this.form = this.fb.group({
      name:     [this.data.value?.name ?? '', [Validators.required, Validators.minLength(2)]],
      street:   [this.data.value?.street ?? ''],
      suburb:   [this.data.value?.colony ?? ''],
      num_ext:  [this.data.value?.num_ext ?? ''],
      city:     [this.data.value?.city ?? ''],
      state:    [this.data.value?.state ?? ''],
      zip:      [this.data.value?.cp ?? ''],
      phone:    [this.data.value?.phone ?? ''],
      email:    [this.data.value?.email ?? '', Validators.email],
      is_active:[this.data.value?.is_active ?? true],
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.ref.close(this.form.getRawValue());
  }
  close() { this.ref.close(); }
}

import { Component, Inject, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import type { Branch, CreateBranchDto } from '../data-access/branches.models';
import { User } from '../../../../core/services/users/user.model';

export type DialogMode = 'create' | 'edit';
export type DialogData = { mode: DialogMode; value?: Branch };

@Component({
  selector: 'app-branch-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './branch-dialog.component.html',
})
export class BranchDialogComponent {

  editing = signal<boolean>(false);
  private fb = inject(FormBuilder);
  private sb = inject(MatSnackBar);
  saving = signal(false);
  logoPreview = signal<string | null>(null);
  gerente = signal<User | null>(null);

  form!: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private ref: MatDialogRef<BranchDialogComponent>
  ) {
    const v = data.value ?? {} as Branch;
    this.editing.set(data?.mode === 'edit');

    this.form = this.fb.group({
      name:     [v.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(80), this.noOnlySpaces]],
      email:    [v.email ?? '', [Validators.email]],
      street:   [v.street ?? ''],
      suburb:   [(v as any).suburb ?? (v as any).colony ?? ''],
      num_ext:  [v.num_ext ?? ''],
      city:     [v.city ?? ''],
      state:    [v.state ?? ''],
      zip:      [(v as any).zip ?? (v as any).cp ?? '', [Validators.pattern(/^\d{5}$/)]],
      phone:    [v.phone ?? '', [Validators.pattern(/^[\d+\-\s]{10,15}$/)]],
      is_active:[v.is_active ?? true],
      logo:     [null], // File | null
    });
  }

  // --- Getters --- //
  title = computed(() => (this.editing() ? 'Editar Sucursal' : 'Nueva Sucursal'));
  subtitle = computed(() => (this.editing() ? 'Modifica los datos de la sucursal' : 'Complete los datos de la nueva sucursal'));

  // --- Validadores
  noOnlySpaces(ctrl: AbstractControl): ValidationErrors | null {
    const val = (ctrl.value ?? '') as string;
    return val.trim().length ? null : { onlySpaces: true };
  }
  showError(name: string, err: string) {
    const c = this.form.get(name);
    return !!c && (c.touched || c.dirty) && c.hasError(err);
  }

  // --- Logo
  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.form.patchValue({ logo: file });
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.logoPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.logoPreview.set(null);
    }
  }
  clearLogo() {
    this.form.patchValue({ logo: null });
    this.logoPreview.set(null);
  }

  // --- Submit
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.sb.open('Corrige los campos marcados antes de guardar', 'OK', { duration: 3000 });
      return;
    }
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const trimmed = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, (typeof v === 'string') ? v.trim() : v])
    ) as any;

    // Mapeos opcionales si tu backend espera cp/colony
    const payload = {
      ...trimmed,
      cp: trimmed.zip,
      colony: trimmed.suburb,
    };

    this.ref.close(payload);
  }

  close() { this.ref.close(); }

}

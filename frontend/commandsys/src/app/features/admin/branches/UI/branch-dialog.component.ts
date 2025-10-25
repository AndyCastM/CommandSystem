import { Component, Inject, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastService } from '../../../../shared/UI/toast.service';

import type { Branch, CreateBranchDto } from '../data-access/branches.models';
import { User } from '../../../../core/services/users/user.model';
import { BranchesApi } from '../data-access/branches.api';

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
  private toast = inject(ToastService);
  private branchSrv = inject(BranchesApi);

  saving = signal(false);
  logoPreview = signal<string | null>(null);
  gerente = signal<User | null>(null);

  form!: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private ref: MatDialogRef<BranchDialogComponent>
  ) {
    const v = data.value ?? ({} as Branch);
    this.editing.set(data?.mode === 'edit');

    this.form = this.fb.group({
      name: [v.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(80), this.noOnlySpaces]],
      email: [v.email ?? '', [Validators.email]],
      street: [v.street ?? ''],
      colony: [v.colony ?? ''],
      num_ext: [v.num_ext ?? ''],
      city: [v.city ?? ''],
      state: [v.state ?? ''],
      cp: [v.cp ?? '', [Validators.pattern(/^\d{5}$/)]],
      phone: [v.phone ?? '', [Validators.required]],
    });
  }

  title = computed(() => (this.editing() ? 'Editar Sucursal' : 'Nueva Sucursal'));
  subtitle = computed(() => (this.editing() ? 'Modifica los datos de la sucursal' : 'Complete los datos de la nueva sucursal'));

  noOnlySpaces(ctrl: AbstractControl): ValidationErrors | null {
    const val = (ctrl.value ?? '') as string;
    return val.trim().length ? null : { onlySpaces: true };
  }
  showError(name: string, err: string) {
    const c = this.form.get(name);
    return !!c && (c.touched || c.dirty) && c.hasError(err);
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Corrige los campos marcados antes de guardar');
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    ) as CreateBranchDto;

    try {
      if (this.editing()) await this.updateBranch(payload);
      else await this.createBranch(payload);
    } catch (err: any) {
      const msg = err.error?.message || 'Error al guardar la sucursal';
      this.toast.error(msg);
    } finally {
      this.saving.set(false);
    }
  }

  private async createBranch(payload: CreateBranchDto) {
    const created = await this.branchSrv.create(payload);
    this.toast.success('Sucursal creada con éxito');
    this.ref.close(created); // ✅ devuelve el branch creado
  }

  private async updateBranch(payload: Partial<Branch>) {
    const id = this.data?.value?.id_branch;
    if (!id) {
      this.toast.error('No se encontró el ID de la sucursal a actualizar');
      return;
    }

    const updated = await this.branchSrv.update(id, payload);
    this.toast.success('Sucursal actualizada correctamente');
    this.ref.close(updated); //  devuelve el branch actualizado
  }

  close() {
    this.ref.close();
  }
}

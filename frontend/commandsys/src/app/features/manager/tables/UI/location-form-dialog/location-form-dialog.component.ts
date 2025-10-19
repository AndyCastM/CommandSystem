import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TableLocationsService } from '../../../../../core/services/tables/table-locations.service';
import { ToastService } from '../../../../../shared/UI/toast.service';
import { MatIconModule } from '@angular/material/icon';

export type LocationDialogMode = 'create' | 'edit';

export interface LocationDialogData {
  mode: LocationDialogMode;
  value?: { id_location: number; name: string; };
}

@Component({
  selector: 'app-location-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './location-form-dialog.component.html',
})
export class LocationFormDialogComponent {
  private fb = inject(FormBuilder);
  private locSrv = inject(TableLocationsService);
  private toast = inject(ToastService);

  saving = signal(false);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LocationDialogData,
    private ref: MatDialogRef<LocationFormDialogComponent>
  ) {
    if (data?.mode === 'edit' && data.value) {
      this.form.patchValue(data.value);
    }
  }

  title() {
    return this.data.mode === 'edit'
      ? 'Editar Localización'
      : 'Nueva Localización';
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);

    // Limpieza del DTO (elimina null/undefined)
    const raw = this.form.value;
    const dto = Object.fromEntries(
      Object.entries(raw).filter(([_, v]) => v !== null && v !== undefined)
    ) as {
      name: string;
      description?: string;
    };

    const obs$ =
      this.data.mode === 'edit' && this.data.value
        ? this.locSrv.update(this.data.value.id_location, dto)
        : this.locSrv.create(dto.name);

    obs$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Localización guardada correctamente');
        this.ref.close(true);
      },
      error: (err) => {
        console.error(err);
        this.saving.set(false);
        this.toast.error('Error al guardar la localización');
      },
    });
  }

  close() {
    this.ref.close(false);
  }
}

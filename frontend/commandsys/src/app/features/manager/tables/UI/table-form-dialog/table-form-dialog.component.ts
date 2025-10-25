import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TablesService } from '../../../../../core/services/tables/tables.service';
import { TableLocationsService } from '../../../../../core/services/tables/table-locations.service';
import { ToastService } from '../../../../../shared/UI/toast.service';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

export type TableDialogMode = 'create' | 'edit';

export interface TableDialogData {
  mode: TableDialogMode;
  value?: { id_table: number; id_location?: number; name?: string; capacity?: number };
}

@Component({
  selector: 'app-table-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSelectModule, MatIconModule],
  templateUrl: './table-form-dialog.component.html',
})
export class TableFormDialogComponent {
  private fb = inject(FormBuilder);
  private tblSrv = inject(TablesService);
  private locSrv = inject(TableLocationsService);
  private toast = inject(ToastService);

  saving = signal(false);
  locations = this.locSrv.locations;

  form = this.fb.group({
    id_location: [0 as number | null, Validators.required],
    number: ['', Validators.required],
    capacity: [2 as number | null, [Validators.required, Validators.min(1)]],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TableDialogData,
    private ref: MatDialogRef<TableFormDialogComponent>
  ) {
    if (data?.mode === 'edit' && data.value) {
      this.form.patchValue(data.value);
    }
  }

  title() {
    return this.data.mode === 'edit' ? 'Editar Mesa' : 'Nueva Mesa';
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);

    // Normaliza valores: elimina nulls y deja solo los definidos
    const raw = this.form.value;
    const dto = Object.fromEntries(
      Object.entries(raw).filter(([_, v]) => v !== null && v !== undefined)
    ) as {
      id_location: number;
      name: string;
      capacity: number;
    };

    const obs$ =
      this.data.mode === 'edit' && this.data.value
        ? this.tblSrv.update(this.data.value.id_table, dto)
        : this.tblSrv.create(dto);

    obs$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Mesa guardada correctamente');
        this.ref.close(true);
      },
      error: (err) => {
        console.error(err);
        this.saving.set(false);
        this.toast.error('Error al guardar mesa');
      },
    });
  }

  close() {
    this.ref.close(false);
  }
}

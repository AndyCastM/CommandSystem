import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Superadmin } from '../../data-access/superadmin';
import { ToastService } from '../../../../shared/UI/toast.service';

@Component({
  selector: 'app-edit-company-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './edit-company-modal.html',
})
export class EditCompanyModalComponent {
  @Input() company!: any;
  @Input() close!: () => void;

  saving = signal(false);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private toast: ToastService,
    private srv: Superadmin,
  ) {
    this.form = this.fb.group({
    name: ['', Validators.required],
    legal_name: ['', Validators.required],
    phone: [''],
    email: ['', [Validators.required, Validators.email]],
    is_active: [true],
  });
  }

  ngOnInit() {
    if (this.company) {
      this.form.patchValue(this.company);
    }
  }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const raw = this.form.value;

      const payload = {
        ...raw,
        is_active: raw.is_active ? 1 : 0  // conversión a tinyint(1) que espera mysql
      };

      await this.srv.updateCompany(this.company.id_company, payload);
      this.toast.success('Empresa actualizada con éxito');
      this.close();
    } catch (err: any) {
      console.error(err);

      let message = 'Error al actualizar empresa';

      if (err.error?.message) {
        if (Array.isArray(err.error.message)) {
          message = err.error.message[0]; //por si viene como array
        } else {
          message = err.error.message; //por si viene como string
        }
      }

  this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }
}

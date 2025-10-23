import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Superadmin } from '../data-access/superadmin';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-company-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSelectModule],
  templateUrl: './company-form.component.html',
})
export class CompanyFormComponent {
  @Input() close!: () => void;
  saving = signal(false);
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private srv: Superadmin,
    private sb: MatSnackBar
  ) {
    this.form = this.fb.group({
      // Empresa
      name: ['', Validators.required],
      legal_name: ['', Validators.required],
      rfc: ['', [Validators.required, Validators.minLength(12)]],
      street: [''],
      num_ext: [''],
      colony: [''],
      cp: [''],
      city: [''],
      state: [''],
      phone: [''],
      email: ['', [Validators.required, Validators.email]],

      // Admin
      admin_name: ['', Validators.required],
      admin_last_name: ['', Validators.required],
      admin_last_name2: [''],
      admin_username: ['', Validators.required],
      admin_password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      await this.srv.createCompany(this.form.value);
      this.sb.open('Empresa creada con éxito', 'OK', { duration: 3000 });
      this.close();
    } catch (err: any) {
      this.sb.open(err.error?.message || 'Error al crear empresa', 'OK', { duration: 4000 });
    } finally {
      this.saving.set(false);
    }
  }

  title() {
    return 'Nueva empresa';
  }

  subtitle() {
    return 'Crea una nueva empresa y su usuario administrador principal';
  }
}

import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Superadmin } from '../../data-access/superadmin';
import { ToastService } from '../../../../shared/UI/toast.service';

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
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      // Empresa
      name: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Za-zÁÉÍÓÚÑÜ0-9 .,'-]{3,80}$/)
        ]
      ],
      legal_name: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Za-zÁÉÍÓÚÑÜ0-9 .,'-]{3,120}$/)
        ]
      ],
      rfc: [
        '',
        [
          Validators.required,
          Validators.pattern(/^([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})$/), // RFC formato oficial
        ],
      ],
      street: ['', Validators.required],
      num_ext: [''],
      colony: ['', Validators.required],
      cp: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      city: ['', Validators.required],
      state: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^(?=(?:.*\d){10,})[0-9 +()-]{10,20}$/)]],
      email: ['', [Validators.required, Validators.email]],

      // Admin
      admin_username: [
        '',
        [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]+$/)],
      ],
      admin_name: ['', Validators.required],
      admin_last_name: ['', Validators.required],
      admin_last_name2: [''],
      admin_password: ['', [Validators.required, Validators.minLength(6)]],
    });

  }

  async submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      await this.srv.createCompany(this.form.value);
      this.toast.success('Empresa creada con éxito');
      this.close();
    } catch (err: any) {
      this.toast.error(err.error?.message || 'Error al crear empresa');
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

  isInvalid(control: string) {
  const c = this.form.get(control);
  return c?.invalid && (c.dirty || c.touched);
}

errorMsg(control: string) {
  const c = this.form.get(control);
  if (!c) return '';

  if (c.errors?.['required']) return 'Campo requerido';
  if (c.errors?.['minlength']) return 'Longitud insuficiente';
  if (c.errors?.['email']) return 'Correo inválido';
  if (c.errors?.['pattern']) {
    if (control === 'rfc') return 'RFC inválido';
    if (control === 'cp') return 'Código postal inválido (5 dígitos)';
    if (control === 'phone') return 'Teléfono inválido (10 dígitos)';
    if (control === 'admin_username')
      return 'Sin espacios, solo letras, números o ._-';
    return 'Formato inválido';
  }

  return 'Valor inválido';
}

}

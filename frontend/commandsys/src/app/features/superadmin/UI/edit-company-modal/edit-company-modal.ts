import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Superadmin } from '../../data-access/superadmin';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    private srv: Superadmin,
    private sb: MatSnackBar
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
      //await this.srv.updateCompany(this.company.id_company, this.form.value);
      this.sb.open('Empresa actualizada con éxito', 'OK', { duration: 3000 });
      this.close();
    } catch (err) {
      console.error(err);
      this.sb.open('Error al actualizar empresa', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }
}

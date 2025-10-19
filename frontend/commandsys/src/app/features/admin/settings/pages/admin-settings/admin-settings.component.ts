import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { SettingsApi } from '../../../settings/data-access/settings.api';
import { CompanySettings } from '../../../settings/data-access/settings.models';
import { ToastService } from '../../../../../shared/UI/toast.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    // Angular
    ReactiveFormsModule,
    // Material
    MatTabsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSlideToggleModule, MatButtonModule, MatDividerModule, MatSnackBarModule, MatIconModule,
  ],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent {

  constructor() {
    // Suscribirse reactivamente a cambios en company (signal)
    effect(() => {
      const c = this.api.company();
      if (c) this.companyForm.patchValue(c, { emitEvent: false });
    });
    this.api.loadInitial();
  }
  
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private api = inject(SettingsApi);

  // Tab activa
  activeTabIndex = signal(0);

  // Formularios
  companyForm = this.fb.group({
    name: ['', Validators.required],
    legal_name: [''],
    rfc: ['', Validators.maxLength(13)],
    street: [''],
    num_ext: [''],
    cp: ['', Validators.maxLength(5)],
    city: [''],
    state: [''],
    country: [''],
    phone: [''],
    email: ['', Validators.email],
    tax_percentage: [16],
  });

  // getters de vista
  get company(): CompanySettings {
    return this.companyForm.getRawValue() as CompanySettings;
  }

  saveCompany() {
    if (this.companyForm.invalid) {
      this.toast.warning('Revisa los campos requeridos.');
      this.companyForm.markAllAsTouched();
      return;
    }
    this.api.saveCompany(this.company);
    this.toast.success('Configuración de la empresa guardada');
  }

  saveFiscal() {
    this.api.saveCompany(this.company);
    this.toast.success('Configuración fiscal guardada');
  }

}

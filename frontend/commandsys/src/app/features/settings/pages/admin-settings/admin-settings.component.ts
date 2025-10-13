import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
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
    CP: ['', Validators.maxLength(5)],
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


  constructor() {
    this.api.loadInitial();
    // hidratar forms desde el api (signals → patchValue)
    const c = this.api.company();
    if (c) this.companyForm.patchValue(c);
  }

  saveCompany() {
    if (this.companyForm.invalid) {
      this.snack.open('Revisa los campos requeridos.', 'OK', { duration: 2200 });
      this.companyForm.markAllAsTouched();
      return;
    }
    this.api.saveCompany(this.company);
    this.snack.open('Configuración de la empresa guardada', 'OK', { duration: 2200 });
  }

  saveFiscal() {
    this.api.saveCompany(this.company);
    this.snack.open('Configuración fiscal guardada', 'OK', { duration: 2200 });
  }

  download(b: { date: string; size: string }) {
    this.snack.open(`Descargando: ${b.date}`, 'OK', { duration: 1600 });
  }
}

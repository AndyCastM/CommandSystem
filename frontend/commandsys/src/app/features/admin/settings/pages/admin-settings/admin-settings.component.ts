import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  PLATFORM_ID,
  OnInit
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { SettingsApi } from '../../../settings/data-access/settings.api';
import { CompanySettings } from '../../../settings/data-access/settings.models';
import { ToastService } from '../../../../../shared/UI/toast.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSlideToggleModule, MatButtonModule, MatDividerModule,
    MatSnackBarModule, MatIconModule,
  ],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent implements OnInit {

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private api = inject(SettingsApi);

  activeTabIndex = signal(0);

  companyForm = this.fb.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(80),
        Validators.pattern(/^[A-Za-zÁÉÍÓÚÑáéíóúüÜ0-9 .,&\-]{2,80}$/)
      ]
    ],

    legal_name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(80),
        Validators.pattern(/^[A-Za-zÁÉÍÓÚÑáéíóúüÜ0-9 .,&\-]{2,80}$/)
      ]
    ],

    rfc: [
      '',
      [
        Validators.maxLength(13),
        Validators.pattern(/^([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})$/)
      ]
    ],

    street: ['', Validators.pattern(/^[A-Za-zÁÉÍÓÚÑáéíóúüÜ0-9 .,#\-]{0,80}$/)],
    num_ext: ['', Validators.maxLength(10)],
    cp: ['', Validators.pattern(/^\d{5}$/)],
    city: ['', Validators.pattern(/^[A-Za-zÁÉÍÓÚÑáéíóúüÜ .\-]{2,80}$/)],
    state: ['', Validators.pattern(/^[A-Za-zÁÉÍÓÚÑáéíóúüÜ .\-]{2,80}$/)],
    country: ['', Validators.pattern(/^[A-Za-zÁÉÍÓÚÑáéíóúüÜ .\-]{2,80}$/)],

    phone: [
      '',
      [
        Validators.pattern(/^(?=(?:.*\d){10,})[0-9 +()-]{10,20}$/)
      ]
    ],

    email: ['', Validators.email],

    tax_percentage: [16],

    ticket_header: ['', Validators.maxLength(250)],
    ticket_footer: ['', Validators.maxLength(250)],
  });

  constructor() {
    effect(() => {
      const c = this.api.company();
      if (c) this.companyForm.patchValue(c, { emitEvent: false });
    });
  }

  async ngOnInit() {
    if (!this.isBrowser) return;
    this.api.loadInitial();
  }

  get company(): CompanySettings {
    return this.companyForm.getRawValue() as CompanySettings;
  }

  async saveCompany() {
    if (this.companyForm.invalid) {
      this.toast.warning('Revisa los campos marcados.');
      this.companyForm.markAllAsTouched();
      return;
    }

    try {
      const body = Object.fromEntries(
        Object.entries(this.companyForm.value)
          .map(([k, v]) => [k, v === null ? undefined : v])
      );

      await this.api.saveCompany(body);
      this.toast.success('Configuración de la empresa guardada');
    } catch (err) {
      console.error(err);
      this.toast.error('Error al guardar la configuración');
    }
  }

  async saveFiscal() {
    try {
      const body = Object.fromEntries(
        Object.entries(this.companyForm.value)
          .map(([k, v]) => [k, v === null ? undefined : v])
      );

      await this.api.saveCompany(body);
      this.toast.success('Configuración fiscal guardada');
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo guardar la configuración fiscal');
    }
  }
}

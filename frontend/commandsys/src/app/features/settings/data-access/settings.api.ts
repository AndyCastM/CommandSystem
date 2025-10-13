import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanySettings } from './settings.models';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private http = inject(HttpClient);
  // demo: signals locales (puedes mover a un store si quieres)
  company = signal<CompanySettings | null>(null);

  loadInitial() {
    
    const company: CompanySettings = {
      name: 'Restaurantes El Sabor',
      legal_name: 'El Sabor Corporativo S.A. de C.V.',
      rfc: 'ESC123456789',
      street: 'Av. Principal',
      num_ext: '123',
      CP: '01234',
      city: 'Ciudad de México',
      state: 'CDMX',
      country: 'México',
      phone: '+52 55 1234 5678',
      email: 'contacto@elsabor.com',
      tax_percentage: 16,
    };

    this.company.set(company);
  }

  saveCompany(body: CompanySettings) {
    // return this.http.put('/api/company', body);
    this.company.set(body);
  }

}

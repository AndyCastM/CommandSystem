import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanySettings , UpdateCompanyResponse} from './settings.models';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';
  company = signal<CompanySettings | null>(null);
  loading = signal(false);

  async loadInitial() {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<CompanySettings>(`${this.baseUrl}/companies/company`, {  withCredentials: true })
      );
      this.company.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async saveCompany(partial: Partial<CompanySettings>) {
    const current = this.company();

    if (!current || !current.id_company) {
      throw new Error('No se encontró el ID de empresa para actualizar.');
    }

    this.loading.set(true);

    try {
      const updated = await firstValueFrom(
        this.http.patch<UpdateCompanyResponse>(
          `${this.baseUrl}/companies/${current.id_company}`,
          partial,
          { withCredentials: true }
        )
      );

      // Mezclamos con el estado local
      this.company.update((prev) => ({
        ...(prev || {}),
        ...updated.company, // tu backend devuelve { message, company }
      }));

      return updated.company;

    } finally {
      this.loading.set(false);
    }
  }

}

import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanySettings } from './settings.models';
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

  saveCompany(body: CompanySettings) {
    // return this.http.put('/api/company', body);
    this.company.set(body);
  }

}

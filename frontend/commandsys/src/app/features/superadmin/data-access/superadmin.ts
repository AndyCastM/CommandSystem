import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Tipos para tipado fuerte
export interface CreateCompanyDto {
  name: string;
  legal_name: string;
  rfc: string;
  street: string;
  num_ext?: string;
  colony: string;
  cp: string;
  city: string;
  state: string;
  phone: string;
  email: string;

  admin_username: string;
  admin_name: string;
  admin_last_name: string;
  admin_last_name2?: string;
  admin_password: string;
}

export interface CompanyResponseDto {
  id_company: number;
  name: string;
  legal_name: string;
  rfc: string;
  phone?: string;
  email: string;
  created_at: string;
  admin_user: {
    id_user: number;
    username: string;
    name: string;
    last_name: string;
    role: string;
  };
}

@Injectable({ providedIn: 'root' })
export class Superadmin {
  private API_URL = 'http://localhost:3000/api/companies'; 
  private API_URL2 = 'http://localhost:3000/api/users'; 

  constructor(private http: HttpClient) {}

  // Obtener todas las empresas
  async getDashboard(): Promise<CompanyResponseDto[]> {
    try {
      const companies =
        (await this.http.get<CompanyResponseDto[]>(this.API_URL).toPromise()) || [];

      return companies;

    } catch (error) {
      console.error('Error al obtener empresas:', error);
      return []; // respuesta consistente
    }
  }

  getGlobalMetrics() {
    return this.http.get<any>(`${this.API_URL2}/users-metrics`);
  }

  // Crear una nueva empresa
  async createCompany(dto: CreateCompanyDto){
    const res = await this.http.post<CompanyResponseDto>(this.API_URL, dto).toPromise();
      if (!res) throw new Error('No se recibió respuesta del servidor');
      return res;
  }

  // Actualizar empresa
  async updateCompany(id_company: number, data: any) {
    return firstValueFrom(
      this.http.patch(`${this.API_URL}/${id_company}`, data)
    );
  }

}

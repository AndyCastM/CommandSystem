import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Tipos para tipado fuerte
export interface CreateCompanyDto {
  name: string;
  legal_name: string;
  rfc: string;
  street?: string;
  num_ext?: string;
  colony?: string;
  cp?: string;
  city?: string;
  state?: string;
  phone?: string;
  email: string;

  admin_name: string;
  admin_last_name: string;
  admin_last_name2?: string;
  admin_username: string;
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

  constructor(private http: HttpClient) {}

  // Obtener todas las empresas
  async getDashboard(): Promise<{
    companies: CompanyResponseDto[];
    metrics: { companies: number; users: number; active: number; inactive: number };
  }> {
    try {
      const companies =
        (await this.http.get<CompanyResponseDto[]>(this.API_URL).toPromise()) || [];

      // Construimos las métricas con seguridad
      const metrics = {
        companies: companies.length,
        users: companies.length * 1,
        active: companies.length,
        inactive: 0,
      };

      return { companies, metrics };
    } catch (error) {
      console.error('Error al obtener empresas:', error);
      // Devuelve un valor por defecto si hay error
      return { companies: [], metrics: { companies: 0, users: 0, active: 0, inactive: 0 } };
    }
  }

  // Crear una nueva empresa
  async createCompany(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    const res = await this.http.post<CompanyResponseDto>(this.API_URL, dto).toPromise();
    if (!res) throw new Error('No se recibió respuesta del servidor');
    return res;
  }
}

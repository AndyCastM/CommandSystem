import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface MenuProduct {
  id_branch_product: number;
  id: number;
  name: string;
  price: number;
  description?: string;
  image?: string;
  options?: any[]; // Las opciones de cada producto (por ejemplo, tamaños, sabores)
}

export interface MenuArea {
  areaId: string; // Puede ser id_area si lo prefieres, o también un nombre
  areaName: string; // Nombre del área (por ejemplo, "Cocina")
  products: MenuProduct[];
}

export interface MenuResponse {
  message: string;
  data: MenuArea[]; // Agrupar por área
}


@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/branches/menu'; // Ajusta tu ruta real

  async getBranchMenu(): Promise<MenuResponse> {
    const response = await firstValueFrom(
      this.http.get<MenuResponse>(`${this.baseUrl}`, { withCredentials: true })
    );

    return response;
  }
}

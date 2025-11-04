import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface MenuCategory {
  category: string;
  products: {
    id: number;
    name: string;
    price: number;
    description?: string;
    image?: string;
    options?: any[];
  }[];
}

export interface MenuResponse {
  message: string;
  data: MenuCategory[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/branches/menu'; // Ajusta tu ruta real

  async getBranchMenu(): Promise<MenuResponse> {
    return await firstValueFrom(
      this.http.get<MenuResponse>(
        `${this.baseUrl}`,
        { withCredentials: true }
      )
    );
  }
}

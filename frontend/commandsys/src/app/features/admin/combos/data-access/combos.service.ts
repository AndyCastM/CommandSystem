import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../../../../core/services/constants';

@Injectable({ providedIn: 'root' })
export class CombosService {
  private baseUrl = API_URL + '/combos';

  constructor(private http: HttpClient) {}

  //  Obtener todos los combos
  getAll() {
    return firstValueFrom(this.http.get<any>(this.baseUrl));
  }

  //  Obtener detalle de un combo
  getById(id_combo: number) {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/${id_combo}`));
  }

  //  Crear combo (fijos + grupos)
  create(data: any) {
    return firstValueFrom(this.http.post<any>(this.baseUrl, data));
  }

  //Actualizar combo vamos viendo
  update(id_combo: number, data: any) {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/${id_combo}`, data));
  }

  // Activar / desactivar combo
  toggleActive(id_combo: number) {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/${id_combo}/toggle`, {}));
  }
}

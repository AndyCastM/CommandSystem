import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BranchSchedulesApi {
  private base = 'http://localhost:3000/api/branches/schedules';

  private http = inject(HttpClient);

  // Obtener todos los horarios de una sucursal
  async getByBranch() {
    return await firstValueFrom(
      this.http.get<any[]>(`${this.base}/days`, { withCredentials: true })
    );
  }

  // Actualizar un día específico
  async updateDay(body: { day_of_week: number; open_time: string; close_time: string }) {
    return await firstValueFrom(
      this.http.patch(`${this.base}/update`, body, { withCredentials: true })
    );
  }

  // Activar o desactivar un día
  async toggleDay(day_of_week: number, active: boolean) {
    const url = `${this.base}/${day_of_week}/${active ? 'activate' : 'deactivate'}`;
    return await firstValueFrom(this.http.patch(url, {}, { withCredentials: true }));
  }
}

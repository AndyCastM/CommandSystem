import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Area, PrinterConfig } from './printers.model';
import { API_URL } from '../constants';

@Injectable({ providedIn: 'root' })
export class PrinterService {

  private http = inject(HttpClient);
  private baseUrl = API_URL + '/print'; // ajusta si tienes apiUrl

  /** Obtener áreas disponibles por sucursal */
  getAreas() {
    return this.http.get<Area[]>(`${this.baseUrl}-areas`);
  }

  /** Obtener impresoras configuradas */
  getStations() {
    return this.http.get<PrinterConfig[]>(`${this.baseUrl}/stations`);
  }

  /** Guardar/Actualizar configuración de impresora */
  upsertPrinter(data: {
    displayName: string;
    printerIp: string;
    areaIds: number[];
    ids_station?: number[];
  }) {
    return this.http.post(`${this.baseUrl}/stations`, data);
  }

  deactivatePrinter(id: number) {
    return this.http.patch(`${this.baseUrl}/stations/${id}/disable`, {});
  }

  activateMany(ids: number[]) {
    return this.http.patch(`${this.baseUrl}/stations/activate-many`, { ids });
  }

  deactivateMany(ids: number[]) {
    return this.http.patch(`${this.baseUrl}/stations/disable-many`, { ids });
  }

}


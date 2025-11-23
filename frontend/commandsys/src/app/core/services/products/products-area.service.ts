import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import type { Area } from './products.models';
import { API_URL } from '../constants';

@Injectable({ providedIn: 'root' })
export class ProductAreasService {
  private http = inject(HttpClient);
  private url = API_URL + '/print-areas';

  readonly areasSig = signal<Area[]>([]);
  readonly loadingSig = signal(false);

  /** Cargar áreas desde el backend */
  fetchAreas() {
    this.loadingSig.set(true);
    return this.http.get<Area[]>(this.url).pipe(
      tap({
        next: areas => {
          this.areasSig.set(areas);
          this.loadingSig.set(false);
        },
        error: () => this.loadingSig.set(false)
      })
    );
  }

  /**  Crear un área nueva y actualizar signal global */
  createArea(name: string) {
    return this.http.post<Area>(this.url, { name }).pipe(
      tap(newArea => {
        this.areasSig.update(prev => [...prev, newArea]);
      })
    );
  }
}

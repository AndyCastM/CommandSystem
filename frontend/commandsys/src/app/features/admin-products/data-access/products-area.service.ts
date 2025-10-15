import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import type { Area } from './products.models';

@Injectable({ providedIn: 'root' })
export class ProductAreasService {
  private http = inject(HttpClient);
  private areas$ = new BehaviorSubject<Area[] | null>(null);

  /** Carga áreas desde el backend */
  fetchAreas(): Observable<Area[]> {
    // Ajusta la URL a tu backend:
    const url = 'http://localhost:3000/api/print-areas'
    return this.http.get<Area[]>(url).pipe(tap(list => this.areas$.next(list)));
  }

  /** Último valor cacheado (útil para no recargar al reabrir el diálogo) */
  get cached(): Area[] | null { return this.areas$.value; }
}

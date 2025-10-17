import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import type { Category } from './products.models';

@Injectable({ providedIn: 'root' })
export class ProductCategoriesService {
  private http = inject(HttpClient);
  private areas$ = new BehaviorSubject<Category[] | null>(null);

  /** Carga categorias desde el backend */
  fetchCategories(): Observable<Category[]> {
    // Ajusta la URL a tu backend:
    const url = 'http://localhost:3000/api/product-categories'
    return this.http.get<Category[]>(url).pipe(tap(list => this.areas$.next(list)));
  }

  /** Último valor cacheado (útil para no recargar al reabrir el diálogo) */
  get cached(): Category[] | null { return this.areas$.value; }
}

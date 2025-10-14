import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import type { ProductCategory } from './products.models';

@Injectable({ providedIn: 'root' })
export class ProductCategoriesService {
  private http = inject(HttpClient);
  private areas$ = new BehaviorSubject<ProductCategory[] | null>(null);

  /** Carga categorias desde el backend */
  fetchCategories(): Observable<ProductCategory[]> {
    // Ajusta la URL a tu backend:
    const url = 'http://localhost:3000/api/product-categories'
    return this.http.get<ProductCategory[]>(url).pipe(tap(list => this.areas$.next(list)));
  }

  /** Último valor cacheado (útil para no recargar al reabrir el diálogo) */
  get cached(): ProductCategory[] | null { return this.areas$.value; }
}

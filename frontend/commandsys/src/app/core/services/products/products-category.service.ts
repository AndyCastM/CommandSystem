import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import type { Category } from './products.models';
import { API_URL } from '../constants';

@Injectable({ providedIn: 'root' })
export class ProductCategoriesService {
  
  categoriesSig = signal<Category[]>([]);
  loadingSig = signal(false);

  private http = inject(HttpClient);
  private areas$ = new BehaviorSubject<Category[] | null>(null);
  private url = API_URL+'/product-categories';

  /** Carga categorias desde el backend */
  fetchCategories() {
    this.loadingSig.set(true);
    return this.http.get<Category[]>(this.url).pipe(
      tap({
        next: cats => {
          this.categoriesSig.set(cats);
          this.loadingSig.set(false);
        },
        error: () => this.loadingSig.set(false)
      })
    );
  }
  /** Último valor cacheado (útil para no recargar al reabrir el diálogo) */
  get cached(): Category[] | null { return this.areas$.value; }

  createCategory(name: string) {
    return this.http.post<Category>(`${this.url}`, { name }).pipe(
      tap(newCat => {
        this.categoriesSig.update(prev => [...prev, newCat]);
      })
    );
  }
}

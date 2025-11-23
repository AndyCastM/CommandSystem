import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, shareReplay, catchError } from 'rxjs';

import {
  BranchProduct,
  CompanyProductApiResponse,
  ProductImage,
  ProductImagesResponse,
} from './products.models';
import { API_URL } from '../constants';

@Injectable({ providedIn: 'root' })
export class BranchProductsService {
  private http = inject(HttpClient);
  private base = API_URL; // API_URL

  loadingSig = signal(false);
  productsSig = signal<BranchProduct[]>([]);

  // === Helper Cloudinary ===
  cld(url?: string, t = 'f_auto,q_auto,c_fill,w_200,h_150') {
    return url ? url.replace('/upload/', `/upload/${t}/`) : '';
  }

  // === Carga de productos de sucursal ===
  loadAll(filters?: { id_category?: number; id_area?: number; search?: string }) {
    this.loadingSig.set(true);

    const q = new URLSearchParams();
    if (filters?.id_category) q.set('id_category', String(filters.id_category));
    if (filters?.id_area) q.set('id_area', String(filters.id_area));
    if (filters?.search) q.set('search', filters.search);

    const url = `${this.base}/company-products/branch_products`;

    const req$ = this.http.get<CompanyProductApiResponse>(url).pipe(
      map(res => res.data as unknown as BranchProduct[]),
      tap(products => {
        this.productsSig.set(products);
        this.loadingSig.set(false);
      }),
      catchError(err => {
        this.loadingSig.set(false);
        return throwError(() => err);
      }),
      shareReplay(1)
    );

    return req$;
  }

  // === Toggle disponibilidad de un producto de sucursal ===
  toggleActive(id_branch_product: number, active: boolean) {
    const url = `${this.base}/company-products/branch/${id_branch_product}/toggle`;
    const body = { is_active: active }; // ya como number (0 | 1)

    // Optimista: cambia localmente
    this.productsSig.update(list =>
      list.map(p =>
        p.id_branch_product === id_branch_product
          ? { ...p, is_active: active }
          : p
      )
    );

    return this.http.patch(url, body).pipe(
      tap(() => {
        // Si backend devuelve el objeto actualizado, podrías mergearlo aquí
      }),
      catchError(err => {
        // revertir optimista
        this.productsSig.update(list =>
          list.map(p =>
            p.id_branch_product === id_branch_product
              ? { ...p, is_active: active === true ? false : true }
              : p
          )
        );
        return throwError(() => err);
      })
    );
  }

  // === Obtener imágenes (usa id_company_product del producto base) ===
  getProductImages(id_company_product: number) {
    const url = `${this.base}/company-products/${id_company_product}/images`;
    return this.http.get<ProductImagesResponse | ProductImage[]>(url).pipe(
      map(res => Array.isArray(res) ? res : (res?.images ?? []))
    );
  }

  // === Cache de miniaturas ===
  private imagesCache = new Map<number, string>();
  private imagesInFlight = new Map<number, Observable<string | null>>();

  getThumbUrl$(id_company_product: number): Observable<string | null> {
    const cached = this.imagesCache.get(id_company_product);
    if (cached) return of(cached);

    const inFlight = this.imagesInFlight.get(id_company_product);
    if (inFlight) return inFlight;

    const req$ = this.getProductImages(id_company_product).pipe(
      map((list: ProductImage[]) => {
        const first = list?.[0]?.image_url ?? null;
        if (first) this.imagesCache.set(id_company_product, first);
        this.imagesInFlight.delete(id_company_product);
        return first;
      }),
      shareReplay(1)
    );

    this.imagesInFlight.set(id_company_product, req$);
    return req$;
  }
  getAreaStyle(areaName: string) {
    const n = (areaName || '').toLowerCase();

    // Cocina o preparación
    if (n.includes('cocina')) {
      return {
        color: 'bg-amber-400',
        textColor: 'text-amber-700',
        barColor: 'from-amber-400 to-amber-500',
        icon: 'restaurant_menu',
      };
    }

    // Bebidas o cafetería
    if (n.includes('bebida') || n.includes('café') || n.includes('barista')) {
      return {
        color: 'bg-cyan-400',
        textColor: 'text-cyan-700',
        barColor: 'from-cyan-400 to-cyan-500',
        icon: 'local_cafe',
      };
    }

    // Bar o tragos
    if (n.includes('bar') || n.includes('tragos')) {
      return {
        color: 'bg-emerald-400',
        textColor: 'text-emerald-700',
        barColor: 'from-emerald-400 to-emerald-500',
        icon: 'wine_bar',
      };
    }

    // Postres o repostería
    if (n.includes('postre') || n.includes('repostería') || n.includes('panadería')) {
      return {
        color: 'bg-pink-400',
        textColor: 'text-pink-700',
        barColor: 'from-pink-400 to-pink-500',
        icon: 'cake',
      };
    }

    // Fallback neutro
    return {
      color: 'bg-slate-400',
      textColor: 'text-slate-700',
      barColor: 'from-slate-300 to-slate-400',
      icon: 'storefront',
    };
  }
}

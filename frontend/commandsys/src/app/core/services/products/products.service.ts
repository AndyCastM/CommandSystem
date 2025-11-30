import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  forkJoin,
  of,
  switchMap,
  tap,
  map,
  shareReplay,
  take,
  mergeMap,
  toArray,
  catchError,
  throwError,
  Observable,
  firstValueFrom,
} from 'rxjs';

import { ProductAreasService } from './products-area.service';
import { ProductCategoriesService } from './products-category.service';

import {
  CompanyProduct,
  CompanyProductApiResponse,
  CreateCompanyProductDto,
  UpdateCompanyProductDto,
  Category,
  Area,
  UploadResponse,
  ProductImage,
  ProductImagesResponse,
  BranchProduct,
  ProductDetail
} from './products.models';
import { API_URL } from '../constants';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private base = API_URL;

  loadingSig = signal<boolean>(false);
  productsSig = signal<CompanyProduct[]>([]);

  private normalizeActive(v: any): 0 | 1 {
    return (v === 1 || v === '1' || v === true) ? 1 : 0;
  }

  /** Cache: id_product -> url primera imagen */
  private imagesCache = new Map<number, string>();
  /** In-flight: id_product -> observable compartido para evitar duplicar requests */
  private imagesInFlight = new Map<number, Observable<string | null>>();

  // Catálogos
  categoriesSig = signal<Category[]>([]);
  areasSig = signal<Area[]>([]);
  private categoriesLoaded = false;
  private areasLoaded = false;

  // Helper Cloudinary
  cld(url?: string, t = 'f_auto,q_auto,c_fill,w_200,h_150') {
    return url ? url.replace('/upload/', `/upload/${t}/`) : '';
  }

  // ---------- CARGAS ----------
  loadAll() {
    this.loadingSig.set(true);

    const urlProducts = `${this.base}/company-products`;
    const urlCats     = `${this.base}/product-categories`;
    const urlAreas    = `${this.base}/print-areas`;

    const req$ = forkJoin({
      categories: this.categoriesLoaded ? of(this.categoriesSig()) : this.http.get<Category[]>(urlCats),
      areas: this.areasLoaded ? of(this.areasSig()) : this.http.get<Area[]>(urlAreas),
      products: this.http.get<CompanyProductApiResponse>(urlProducts),
    }).pipe(
      map(({ categories, areas, products }) => ({
        categories,
        areas,
        products: products.data,
      })),
      tap(({ categories, areas, products }) => {
        if (!this.categoriesLoaded) { this.categoriesSig.set(categories); this.categoriesLoaded = true; }
        if (!this.areasLoaded)      { this.areasSig.set(areas);         this.areasLoaded = true; }
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

  // === SUBIR IMAGEN LIGADA A PRODUCTO ===
  uploadImageForProduct(id_company_product: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const url = `${this.base}/company-products/${id_company_product}/upload`;
    return this.http.post<any>(url, fd);
  }

  // ---------- CRUD ----------
  create(input: CreateCompanyProductDto, imageFile?: File): Observable<CompanyProduct> {
    const createUrl = `${this.base}/company-products`;

    return this.http.post<CompanyProduct>(createUrl, input).pipe(
      switchMap(created => {
        if (!imageFile) {
          this.productsSig.set([created, ...this.productsSig()]);
          return of(created);
        }

        return this.uploadImageForProduct(created.id_company_product, imageFile).pipe(
          map(uploadRes => {
            const updated = (uploadRes?.product ?? uploadRes) as CompanyProduct || created;
            this.productsSig.set([
              updated,
              ...this.productsSig().filter(p => p.id_company_product !== created.id_company_product),
            ]);
            return updated;
          })
        );
      }),
      tap(() => console.log('Producto creado y/o imagen subida correctamente')),
      catchError(err => {
        console.error('Error creando producto o subiendo imagen:', err);
        return throwError(() => err);
      })
    );
  }

  // 🔥 AQUÍ ES DONDE CAMBIA LA MAGIA
  update(id_company_product: number, patch: UpdateCompanyProductDto, imageFile?: File) {
    const url = `${this.base}/company-products/${id_company_product}`;

    return this.http.patch<{ data: CompanyProduct }>(url, patch).pipe(
      // el back ahora manda { statusCode, message, data, timestamp }
      map(res => res.data),
      switchMap(updated => {
        if (!imageFile) {
          // updated YA trae category, area, image_url, etc.
          this.productsSig.update(list =>
            list.map(p =>
              p.id_company_product === id_company_product ? updated : p
            )
          );
          return of(updated);
        }

        // Si además se sube nueva imagen:
        return this.uploadImageForProduct(id_company_product, imageFile).pipe(
          map(uploadRes => {
            const merged = (uploadRes?.product ?? uploadRes) as CompanyProduct || updated;

            this.productsSig.update(list =>
              list.map(p =>
                p.id_company_product === id_company_product ? merged : p
              )
            );

            return merged;
          })
        );
      })
    ).subscribe(); // lo sigues llamando como "fire and forget" desde el componente
  }

  remove(id_company_product: number) {
    const url = `${this.base}/company-products/${id_company_product}`;
    return this.http.delete(url).pipe(
      tap(() =>
        this.productsSig.set(
          this.productsSig().filter(p => p.id_company_product !== id_company_product)
        )
      )
    ).subscribe();
  }

  setActive(id_company_product: number, active: boolean) {
    const url = `${this.base}/company-products/company/${id_company_product}/toggle`;
    const body = { is_active: active ? 1 : 0 };

    // update optimista
    this.productsSig.update(list =>
      list.map(p => p.id_company_product === id_company_product
        ? { ...p, is_active: body.is_active }
        : p
      )
    );

    return this.http.patch(url, body).pipe(
      // si quieres, aquí podrías leer res.data, pero como ya hicimos
      // el cambio optimista, con que no truene nos damos por servidos
      catchError(err => {
        // revertir si falla
        this.productsSig.update(list =>
          list.map(p => p.id_company_product === id_company_product
            ? { ...p, is_active: this.normalizeActive(!active) }
            : p
          )
        );
        return throwError(() => err);
      })
    );
  }

  async getDetail(id_branch_product: number): Promise<{ data: ProductDetail }> {
    const url = `${this.base}/company-products/${id_branch_product}`;
    return await firstValueFrom(this.http.get<{ data: ProductDetail }>(url));
  }

  getCompanyProductDetail(id_company_product: number) {
    const url = `${this.base}/company-products/detail/${id_company_product}`;
    return this.http.get<{ data: ProductDetail }>(url);
  }

  // === OBTENER IMÁGENES DE UN PRODUCTO ===
  getProductImages(id_company_product: number) {
    const url = `${this.base}/company-products/${id_company_product}/images`;
    return this.http.get<ProductImagesResponse | ProductImage[]>(url).pipe(
      map(res => Array.isArray(res) ? res : (res?.images ?? []))
    );
  }

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

  warmImagesFor(products: CompanyProduct[], concurrency = 4) {
    const pending = products
      .map(p => p.id_company_product)
      .filter(id =>
        !this.imagesCache.has(id) &&
        !this.imagesInFlight.has(id)
      );

    if (!pending.length) return;

    of(...pending).pipe(
      mergeMap(id => this.getThumbUrl$(id).pipe(take(1)), concurrency),
      toArray()
    ).subscribe({ error: () => {/* ignore */} });
  }

  get categoriesCached(): Category[] | null { return this.categoriesLoaded ? this.categoriesSig() : null; }
  get areasCached(): Area[] | null { return this.areasLoaded ? this.areasSig() : null; }

  getAreaStyle(areaName: string) {
    const n = (areaName || '').toLowerCase();

    if (n.includes('cocina')) {
      return {
        color: 'bg-amber-400',
        textColor: 'text-amber-700',
        barColor: 'from-amber-400 to-amber-500',
        icon: 'restaurant_menu',
      };
    }

    if (n.includes('bebida') || n.includes('café') || n.includes('barista')) {
      return {
        color: 'bg-cyan-400',
        textColor: 'text-cyan-700',
        barColor: 'from-cyan-400 to-cyan-500',
        icon: 'local_cafe',
      };
    }

    if (n.includes('bar') || n.includes('tragos')) {
      return {
        color: 'bg-emerald-400',
        textColor: 'text-emerald-700',
        barColor: 'from-emerald-400 to-emerald-500',
        icon: 'wine_bar',
      };
    }

    if (n.includes('postre') || n.includes('repostería') || n.includes('panadería')) {
      return {
        color: 'bg-pink-400',
        textColor: 'text-pink-700',
        barColor: 'from-pink-400 to-pink-500',
        icon: 'cake',
      };
    }

    return {
      color: 'bg-slate-400',
      textColor: 'text-slate-700',
      barColor: 'from-slate-300 to-slate-400',
      icon: 'storefront',
    };
  }
}

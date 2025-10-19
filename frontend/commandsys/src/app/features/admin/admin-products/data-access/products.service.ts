import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, of, switchMap, tap, map, shareReplay, take, mergeMap, toArray, catchError, throwError } from 'rxjs';
import { Observable } from 'rxjs';

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
} from './products.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private base = 'http://localhost:3000';

  loadingSig = signal<boolean>(false);
  productsSig = signal<CompanyProduct[]>([]);
  
  private normalizeActive(v: any): 0 | 1 {
    return (v === 1 || v === '1' || v === true) ? 1 : 0;
  }
  
  /** Cache: id_product -> url primera imagen */
  private imagesCache = new Map<number, string>();
  /** In-flight: id_product -> observable compartido para evitar duplicar requests */
  private imagesInFlight = new Map<number, Observable<string | null>>();

  // Catálogos (por si los usas en el diálogo)
  categoriesSig = signal<Category[]>([]);
  areasSig = signal<Area[]>([]);
  private categoriesLoaded = false;
  private areasLoaded = false;

  // Helper Cloudinary (para cuando uses imágenes reales)
  cld(url?: string, t = 'f_auto,q_auto,c_fill,w_200,h_150') {
    return url ? url.replace('/upload/', `/upload/${t}/`) : '';
  }

  // ---------- CARGAS ----------
  loadAll() {
    this.loadingSig.set(true);

    const urlProducts = `${this.base}/api/company-products`;
    const urlCats     = `${this.base}/api/product-categories`;
    const urlAreas    = `${this.base}/api/print-areas`;

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
  // Usa 'file' porque tu FileInterceptor('file') lo espera con ese nombre
  uploadImageForProduct(id_company_product: number, file: File) {
    const fd = new FormData();
    fd.append('file', file); //  clave correcta
    const url = `${this.base}/api/company-products/${id_company_product}/upload`; // ⬅️ usa :id
    return this.http.post<any>(url, fd);
  }

  // ---------- CRUD ----------
  create(input: CreateCompanyProductDto, imageFile?: File) {
    const createUrl = `${this.base}/api/company-products`;

    return this.http.post<CompanyProduct>(createUrl, input).pipe(
      switchMap(created => {
        if (!imageFile) {
          this.productsSig.set([created, ...this.productsSig()]);
          return of(created);
        }
        return this.uploadImageForProduct(created.id_company_product, imageFile).pipe(
          map(uploadRes => {
            const updated = (uploadRes?.product ?? uploadRes) as CompanyProduct || created;
            this.productsSig.set([updated, ...this.productsSig().filter(p => p.id_company_product !== created.id_company_product)]);
            return updated;
          })
        );
      })
    ).subscribe();
  }

  update(id_company_product: number, patch: UpdateCompanyProductDto, imageFile?: File) {
    const url = `${this.base}/api/company-products/${id_company_product}`;

    return this.http.patch<CompanyProduct>(url, patch).pipe(
      switchMap(updated => {
        if (!imageFile) {
          this.productsSig.set(this.productsSig().map(p => p.id_company_product === id_company_product ? updated : p));
          return of(updated);
        }
        return this.uploadImageForProduct(id_company_product, imageFile).pipe(
          map(uploadRes => {
            const merged = (uploadRes?.product ?? uploadRes) as CompanyProduct || updated;
            this.productsSig.set(this.productsSig().map(p => p.id_company_product === id_company_product ? merged : p));
            return merged;
          })
        );
      })
    ).subscribe();
  }

  remove(id_company_product: number) {
    const url = `${this.base}/api/company-products/${id_company_product}`;
    return this.http.delete(url).pipe(
      tap(() => this.productsSig.set(this.productsSig().filter(p => p.id_company_product !== id_company_product)))
    ).subscribe();
  }

  setActive(id_company_product: number, active: boolean) {
    // si tu endpoint es este (como mostraste):
    const url = `${this.base}/api/company-products/company/${id_company_product}/toggle`;
    // si tu backend realmente usa PATCH /api/company-products/:id con body { is_active }, cambia esa URL
    const body = { is_active: active ? 1 : 0 };

    // Optimista: actualiza en memoria primero (merge)
    this.productsSig.update(list =>
      list.map(p => p.id_company_product === id_company_product
        ? { ...p, is_active: body.is_active }
        : p
      )
    );

    return this.http.patch<CompanyProduct | Partial<CompanyProduct>>(url, body).pipe(
      tap(res => {
        // normaliza y mergea con el existente
        this.productsSig.update(list =>
          list.map(p => {
            if (p.id_company_product !== id_company_product) return p;
            const next = { ...p, ...res } as CompanyProduct;
            next.is_active = this.normalizeActive((res as any)?.is_active ?? p.is_active);
            return next;
          })
        );
      }),
      catchError(err => {
        // revertir optimista
        this.productsSig.update(list =>
          list.map(p => p.id_company_product === id_company_product
            ? { ...p, is_active: this.normalizeActive(!active) } // vuelve al estado previo
            : p
          )
        );
        return throwError(() => err);
      })
    );
  }

  // On-demand (si quieres usarlos por separado)
  fetchCategories() {
    return this.http.get<Category[]>(`${this.base}/api/product-categories`).pipe(
      tap(list => { this.categoriesSig.set(list); this.categoriesLoaded = true; })
    );
  }
  fetchAreas() {
    return this.http.get<Area[]>(`${this.base}/api/print-areas`).pipe(
      tap(list => { this.areasSig.set(list); this.areasLoaded = true; })
    );
  }

  // === OBTENER IMÁGENES DE UN PRODUCTO ===
  // Tu controller expone GET /api/company-products/:id_product/images
  getProductImages(id_company_product: number) {
    const url = `${this.base}/api/company-products/${id_company_product}/images`; // ⬅️ usa :id_product
    return this.http.get<ProductImagesResponse | ProductImage[]>(url).pipe(
      // Soporta dos formatos: { images: [...] } o directamente [...]
      map(res => {
        const images = Array.isArray(res) ? res : (res?.images ?? []);
        return images;
      })
    );
  }

    /**
   * Devuelve la URL de miniatura para un product id:
   * - Si está en cache: regresa sin pedir a la red.
   * - Si no, dispara getProductImages(id) UNA sola vez (compartida) y cachea la primera.
   */
  getThumbUrl$(id_company_product: number): Observable<string | null> {
    // cache
    const cached = this.imagesCache.get(id_company_product);
    if (cached) return of(cached);

    // in-flight (evita duplicar)
    const inFlight = this.imagesInFlight.get(id_company_product);
    if (inFlight) return inFlight;

    const req$ = this.getProductImages(id_company_product).pipe(
      map((list: ProductImage[]) => {
        const first = list?.[0]?.image_url ?? null;
        if (first) this.imagesCache.set(id_company_product, first);
        // limpia el inFlight cuando termina (éxito o null)
        this.imagesInFlight.delete(id_company_product);
        return first;
      }),
      shareReplay(1) // comparte a múltiples suscriptores
    );

    this.imagesInFlight.set(id_company_product, req$);
    return req$;
  }

  /**
   * Prefetch para un conjunto de productos visibles con límite de concurrencia.
   * Útil al cambiar filtro/paginación.
   */
  warmImagesFor(products: CompanyProduct[], concurrency = 4) {
    // filtra los que no estén en cache ni inFlight
    const pending = products
      .map(p => p.id_company_product)
      .filter(id =>
        !this.imagesCache.has(id) &&
        !this.imagesInFlight.has(id)
      );

    if (!pending.length) return;

    // dispara N en paralelo (mergeMap concurrency)
    of(...pending).pipe(
      mergeMap(id => this.getThumbUrl$(id).pipe(take(1)), concurrency),
      toArray() // consume
    ).subscribe({ error: () => {/* swallow */} });
  }


  get categoriesCached(): Category[] | null { return this.categoriesLoaded ? this.categoriesSig() : null; }
  get areasCached(): Area[] | null { return this.areasLoaded ? this.areasSig() : null; }

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

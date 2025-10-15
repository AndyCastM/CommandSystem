import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, of, switchMap, tap, map } from 'rxjs';
import {
  CompanyProduct,
  CompanyProductApiResponse,
  CreateCompanyProductDto,
  UpdateCompanyProductDto,
  Category,
  Area,
  UploadResponse
} from './products.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private base = 'http://localhost:3000';

  loadingSig = signal<boolean>(false);
  productsSig = signal<CompanyProduct[]>([]);

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
  loadAll(params?: { id_company?: number; id_branch?: number }) {
    this.loadingSig.set(true);

    let p = new HttpParams();
    if (params?.id_company) p = p.set('id_company', params.id_company);
    if (params?.id_branch)  p = p.set('id_branch',  params.id_branch);

    const urlProducts = `${this.base}/api/company-products`;
    const urlCats     = `${this.base}/api/product-categories`;
    const urlAreas    = `${this.base}/api/print-areas`;

    const req$ = forkJoin({
      categories: this.categoriesLoaded ? of(this.categoriesSig()) : this.http.get<Category[]>(urlCats),
      areas: this.areasLoaded ? of(this.areasSig()) : this.http.get<Area[]>(urlAreas),
      products: this.http.get<CompanyProductApiResponse>(urlProducts, { params: p }),
    });

    return req$.pipe(
      map(({ categories, areas, products }) => ({
        categories,
        areas,
        products: products.data, // ⬅️ wrapper.data
      })),
      tap(({ categories, areas, products }) => {
        if (!this.categoriesLoaded) { this.categoriesSig.set(categories); this.categoriesLoaded = true; }
        if (!this.areasLoaded)      { this.areasSig.set(areas);         this.areasLoaded = true; }
        this.productsSig.set(products);
      }),
      tap(() => this.loadingSig.set(false))
    ).subscribe({ error: () => this.loadingSig.set(false) });
  }

  // ---------- UPLOAD ligado a producto ----------
  uploadImageForProduct(id_company_product: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const url = `${this.base}/api/company-products/${id_company_product}/upload`;
    return this.http.post<any>(url, fd);
    // Ideal: responde el producto actualizado; si no, hacemos merge mínimo en create/update
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
    const url = `${this.base}/api/company-products/${id_company_product}`;
    const body = { is_active: active ? 1 : 0 };
    return this.http.patch<CompanyProduct>(url, body).pipe(
      tap(updated => {
        this.productsSig.set(this.productsSig().map(p => p.id_company_product === id_company_product ? updated : p));
      })
    ).subscribe();
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

  get categoriesCached(): Category[] | null { return this.categoriesLoaded ? this.categoriesSig() : null; }
  get areasCached(): Area[] | null { return this.areasLoaded ? this.areasSig() : null; }
}

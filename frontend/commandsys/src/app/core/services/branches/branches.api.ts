import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Branch, CreateBranchDto, UpdateBranchDto } from './branches.models';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../constants';

@Injectable({ providedIn: 'root' })
export class BranchesApi {
  private http = inject(HttpClient);
  private baseUrl = API_URL;

  branches = signal<Branch[]>([]);
  loading = signal(false);

  async load() {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<Branch[]>(`${this.baseUrl}/branches`, {  withCredentials: true })
      );
      this.branches.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async getById(id_branch?: number) {
    const url = id_branch
      ? `${this.baseUrl}/branches/${id_branch}`
      : `${this.baseUrl}/branches/specific`;

    return await firstValueFrom(
      this.http.get<any>(url, { withCredentials: true })
    );
  }


  async getAll(){
    return await firstValueFrom(
      this.http.get<Branch[]>(`${this.baseUrl}/branches`, {  withCredentials: true })
    );
  }
  
  async create(dto: CreateBranchDto) {
    const created = await firstValueFrom(
      this.http.post<Branch>(`${this.baseUrl}/branches`, dto, { withCredentials: true })
    );
    this.branches.update(list => [created, ...list]);
    return created;
  }

  async update(id_branch: number, dto: UpdateBranchDto) {
    const updated = await firstValueFrom(
      this.http.put<Branch>(`${this.baseUrl}/branches/${id_branch}`, dto, { withCredentials: true })
    );
    this.branches.update(list => list.map(b => b.id_branch === id_branch ? updated : b));
    return updated;
  }

  // Cambiamos a async para mantener el patrón "await"
  async activate(id_branch: number) {
    const res = await firstValueFrom(
      this.http.patch<{ message: string }>(`${this.baseUrl}/branches/${id_branch}/activate`, {}, { withCredentials: true })
    );
    return res;
  }

  async deactivate(id_branch: number) {
    const res = await firstValueFrom(
      this.http.delete<{ message: string }>(`${this.baseUrl}/branches/${id_branch}`, { withCredentials: true })
    );
    return res;
  }
  
  optimisticSetActive(id_branch: number, active: boolean) {
    const prev = this.branches();                  // snapshot para revertir
    const next = prev.map(b =>
      b.id_branch === id_branch ? { ...b, is_active: !!active } : b
    );
    this.branches.set(next);                   

    // función para revertir si la API falla
    return () => this.branches.set(prev);
  }
}

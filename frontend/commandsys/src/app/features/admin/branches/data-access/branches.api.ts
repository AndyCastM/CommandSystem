import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Branch, CreateBranchDto, UpdateBranchDto } from './branches.models';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../../../../core/services/constants';

@Injectable({ providedIn: 'root' })
export class BranchesApi {
  private http = inject(HttpClient);
  private baseUrl = API_URL;

  // ÚNICO store de la lista
  private _branches = signal<Branch[]>([]);
  // Exponer solo lectura hacia afuera
  branches = () => this._branches();

  loading = signal(false);

  async load() {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<Branch[]>(`${this.baseUrl}/branches`, { withCredentials: true })
      );
      this._branches.set(data ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  // Helpers para que el PADRE sea el único en mutar el store
  prependToList(b: Branch) {
    this._branches.update(list => [b, ...list]);
  }
  replaceInList(updated: Branch) {
    this._branches.update(list =>
      list.map(b => (b.id_branch === updated.id_branch ? updated : b))
    );
  }

  async create(dto: CreateBranchDto) {
    return await firstValueFrom(
      this.http.post<Branch>(`${this.baseUrl}/branches`, dto, { withCredentials: true })
    );
  }

  async update(id_branch: number, dto: UpdateBranchDto) {
    return await firstValueFrom(
      this.http.patch<Branch>(`${this.baseUrl}/branches/${id_branch}`, dto, { withCredentials: true })
    );
  }

  async activate(id_branch: number) {
    return await firstValueFrom(
      this.http.patch<{ message: string }>(`${this.baseUrl}/branches/${id_branch}/activate`, {}, { withCredentials: true })
    );
  }

  async deactivate(id_branch: number) {
    return await firstValueFrom(
      this.http.delete<{ message: string }>(`${this.baseUrl}/branches/${id_branch}`, { withCredentials: true })
    );
  }

  optimisticSetActive(id_branch: number, active: boolean) {
    const prev = this._branches();
    this._branches.update(list =>
      list.map(b => (b.id_branch === id_branch ? { ...b, is_active: !!active } : b))
    );
    return () => this._branches.set(prev);
  }
}

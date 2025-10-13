import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Branch, CreateBranchDto, UpdateBranchDto } from './branches.models';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BranchesApi {
  private http = inject(HttpClient);
  
  private baseUrl = 'http://localhost:3000/api'; 

  branches = signal<Branch[]>([]);
  loading = signal(false);

  async load() {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<Branch[]>(`${this.baseUrl}/branches`)
      );
      this.branches.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async create(companyId: number, dto: CreateBranchDto) {
    const created = await firstValueFrom(
      this.http.post<Branch>(`${this.baseUrl}/${companyId}/branches`, dto)
    );
    this.branches.update(list => [created, ...list]);
    return created;
  }

  async update(companyId: number, id_branch: number, dto: UpdateBranchDto) {
    const updated = await firstValueFrom(
      this.http.put<Branch>(`${this.baseUrl}/${companyId}/branches/${id_branch}`, dto)
    );
    this.branches.update(list => list.map(b => b.id_branch === id_branch ? updated : b));
    return updated;
  }

  async setActive(companyId: number, id_branch: number, is_active: boolean) {
    const updated = await firstValueFrom(
      this.http.patch<Branch>(`${this.baseUrl}/${companyId}/branches/${id_branch}`, { is_active })
    );
    this.branches.update(list => list.map(b => b.id_branch === id_branch ? updated : b));
    return updated;
  }
}

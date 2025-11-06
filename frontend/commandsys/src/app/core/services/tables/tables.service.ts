import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap, catchError, throwError, shareReplay } from 'rxjs';
import { firstValueFrom } from 'rxjs';

export interface Table {
  id_table: number;
  id_location: number;
  number: string;
  capacity: number;
  is_active: number;
  table_locations: {id_location: number, name: string};
}

export interface TableInfo {
  id: number;
  name: string;
  seats: number;
  location: string;
  status: string;
  opened_at?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TablesService {
  private http = inject(HttpClient);
  private base = 'http://localhost:3000/api/tables';

  loading = signal(false);
  tables = signal<Table[]>([]);

  loadAll(is_active?: number) {
    this.loading.set(true);
    const url = `${this.base}${is_active !== undefined ? '?is_active=' + is_active : ''}`;
    return this.http.get<{ data: Table[] }>(url).pipe(
      map((res) => Array.isArray(res) ? res : res.data ?? []), 
      tap(list => {
        this.tables.set(list);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      }),
      shareReplay(1)
    );
  }

  create(table: { id_location: number; name: string; capacity: number }) {
    return this.http.post(this.base, table).pipe(
      tap(() => this.loadAll().subscribe())
    );
  }

  deactivate(id: number) {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.loadAll().subscribe())
    );
  }

  activate(id: number) {
    return this.http.patch(`${this.base}/${id}/activate`, {}).pipe(
      tap(() => this.loadAll().subscribe())
    );
  }

  update(id_table: number, dto: Partial<Table>) {
    return this.http.patch<Table>(`${this.base}/${id_table}`, dto).pipe(
      tap((updated) => {
        this.tables.update((list) =>
          list.map((t) => (t.id_table === id_table ? updated : t))
        );
      }),
      catchError((err) => throwError(() => err))
    );
  }

  async getTablesByBranch(): Promise<TableInfo[]> {
    return await firstValueFrom(
      this.http.get<TableInfo[]>(`${this.base}/branch`, { withCredentials: true })
    );
  }
}

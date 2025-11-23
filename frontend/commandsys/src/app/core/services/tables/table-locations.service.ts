import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap, catchError, throwError, shareReplay } from 'rxjs';
import { API_URL } from '../constants';

export interface TableLocation {
  id_location: number | null;
  name: string;
  is_active: number;
}

@Injectable({ providedIn: 'root' })
export class TableLocationsService {
  private http = inject(HttpClient);
  private base = API_URL + '/branches/locations';

  loading = signal(false);
  locations = signal<TableLocation[]>([]);

  loadAll(is_active?: number) {
    this.loading.set(true);
    const url = `${this.base}/all${is_active !== undefined ? '?is_active=' + is_active : ''}`;
    return this.http.get<{ data: TableLocation[] }>(url).pipe(
      map((res) => Array.isArray(res) ? res : res.data ?? []), 
      tap(list => {
        this.locations.set(list);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      }),
      shareReplay(1)
    );
  }

  create(name: string) {
    const body = { name };
    return this.http.post(this.base, body).pipe(
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

  update(id_location: number, dto: Partial<TableLocation>) {
    return this.http.patch<TableLocation>(`${this.base}/${id_location}`, dto).pipe(
      tap((updated) => {
        this.locations.update((list) =>
          list.map((l) => (l.id_location === id_location ? updated : l))
        );
      }),
      catchError((err) => throwError(() => err))
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_URL } from './constants';

export interface Role {
    id_role: number;
    name: string;
}
@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private roles$ = new BehaviorSubject<Role[] | null>(null);

  getRoles(): Observable<Role[]> {
    const url =  API_URL + '/users/roles';
    return this.http.get<Role[]>(url).pipe(tap(list => this.roles$.next(list)));
  }

  /** Último valor cacheado (útil para no recargar al reabrir el diálogo) */
  get cached(): Role[] | null { return this.roles$.value; }
}

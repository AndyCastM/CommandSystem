import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Role {
    id_role: number;
    name: string;
}
@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private roles$ = new BehaviorSubject<Role[] | null>(null);

  /** Carga áreas desde el backend */
  getRoles(): Observable<Role[]> {
    // Ajusta la URL a tu backend:
    const url = 'http://localhost:3000/api/users/roles'
    return this.http.get<Role[]>(url).pipe(tap(list => this.roles$.next(list)));
  }

  /** Último valor cacheado (útil para no recargar al reabrir el diálogo) */
  get cached(): Role[] | null { return this.roles$.value; }
}

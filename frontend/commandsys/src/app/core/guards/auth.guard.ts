// src/app/core/guards/auth.guard.ts
import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { isBrowser } from '../utils/platform';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class authGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate():
    | boolean
    | UrlTree
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree> {

    //  SSR: NO hagas lógica de auth, solo deja pasar.
    // No hay cookies, no hay session de user, no hay redirect.
    if (!isBrowser()) {
      // En server solo renderizamos, el cliente ya se encargará de redirigir si no hay sesión.
      return true;
    }

    //  Browser: revisa si ya tenemos usuario en memoria
    const user = this.auth.currentUser();
    if (user) {
      return true;
    }

    // Si no hay usuario en memoria, intentamos restaurar sesión con /auth/me
    return this.auth.ensureSession$().pipe(
      map((u) => {
        if (u) {
          // Sesión valida → deja pasar
          return true;
        }

        // No hay sesión → redirige a login
        return this.router.createUrlTree(['/login']);
      }),
      catchError(() => {
        // En cualquier error, llévatelo a login
        return of(this.router.createUrlTree(['/login']));
      })
    );
  }
}

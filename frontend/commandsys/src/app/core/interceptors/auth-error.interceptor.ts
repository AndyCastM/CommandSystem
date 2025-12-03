import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpContextToken
} from '@angular/common/http';

import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const SKIP_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const router = inject(Router);

  const skip = req.context.get(SKIP_AUTH_REDIRECT);

  // Endpoints que NUNCA deben gatillar redirect
  const excluded =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/logout') ||
    req.url.includes('/auth/waiter_sessions') ||   // 🔥 lo agregamos
    req.url.includes('/auth/me');

  const LOGIN_PATH = '/login';

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      
      // ❌ No redirigir jamás si es ruta excluida
      if (excluded) {
        return throwError(() => err);
      }

      // ❌ No redirigir por 400 o 403 (errores de negocio)
      if (err.status === 400 || err.status === 403) {
        return throwError(() => err);
      }

      // ✔ Solo redirigir cuando es 401 (token inválido / vencido)
      if (err.status === 401 && isBrowser && !skip) {
        console.warn("INTERCEPTOR: redirigiendo por 401");
        const current = router.routerState.snapshot.url || '/';
        if (!current.startsWith(LOGIN_PATH)) {
          router.navigate([LOGIN_PATH], { queryParams: { redirect: current } });
        }
      }

      return throwError(() => err);
    })
  );
};

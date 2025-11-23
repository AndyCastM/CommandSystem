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

  //  Rutas que nunca deben redirigir, porque by definition retornan 401
  const excluded =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/logout') ||
    req.url.includes('/auth/me');

  const LOGIN_PATH = '/login';

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isBrowser && !skip && !excluded) {
        const current = router.routerState.snapshot.url || '/';
        if (!current.startsWith(LOGIN_PATH)) {
          router.navigate([LOGIN_PATH], { queryParams: { redirect: current } });
        }
      }
      return throwError(() => err);
    })
  );
};

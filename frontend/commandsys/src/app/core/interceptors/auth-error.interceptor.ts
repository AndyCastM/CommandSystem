import { HttpInterceptorFn, HttpErrorResponse, HttpContextToken } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

// Exportar el token
export const SKIP_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);

const LOGIN_PATH = '/'; 

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const skip = req.context.get(SKIP_AUTH_REDIRECT);
      if (err.status === 401 && isBrowser && !skip) {
        const current = router.routerState.snapshot.url || '/';
        if (!current.startsWith(LOGIN_PATH)) {
          router.navigate([LOGIN_PATH], { queryParams: { redirect: current } });
        }
      }
      return throwError(() => err);
    })
  );
};

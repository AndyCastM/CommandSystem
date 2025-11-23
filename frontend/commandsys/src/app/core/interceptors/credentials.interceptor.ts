import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // SOLO agregar withCredentials si estamos en el navegador
  if (isPlatformBrowser(platformId)) {
    return next(req.clone({ withCredentials: true }));
  }

  // SSR: NO enviar cookies (porque no existen)
  return next(req);
};

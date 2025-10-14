// ESTO ES IMPORTANTE PARA QUE LAS PETICIONES HTTP INCLUYAN LAS COOKIES
import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));

import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService, Role } from '../../auth/services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const allowed: Role[] = route.data?.['roles'] ?? [];
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.userSig();

  if (!user) { router.navigate(['/login']); return false; }
  if (allowed.length === 0 || allowed.includes(user.role)) return true;

  router.navigate(['/forbidden']); // crea una vista 403 si quieres
  return false;
};

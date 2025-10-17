import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService, Role } from '../../auth/services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const allowed: Role[] = route.data?.['roles'] ?? [];
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user) { router.navigate(['/login']); return false; }

  // Safely extract role from the login response (adapt to your actual response shape)
  const role = (user as any)?.role ?? (user as any)?.user?.role;

  if (allowed.length === 0 || (role && allowed.includes(role as Role))) return true;

  router.navigate(['/forbidden']); // crea una vista 403 si quieres
  return false;
};

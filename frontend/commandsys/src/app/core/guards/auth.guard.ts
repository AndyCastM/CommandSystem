// auth.guard.ts (CanActivateFn)
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../../auth/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  return auth.isLoggedIn$().pipe(
    tap(ok => {
      if (!ok && isBrowser) {
        const redirect = router.routerState.snapshot.url || '/';
        router.navigate(['/'], { queryParams: { redirect } });
      }
    }),
    map(ok => ok)
  );
};

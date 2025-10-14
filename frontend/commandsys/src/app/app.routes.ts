import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { AdminSettingsComponent } from './features/settings/pages/admin-settings/admin-settings.component';
import { authGuard } from './core/guards/auth.guard';
 
export const routes: Routes = [
    { path : '', component: Login },
    {
    path: 'admin',
    loadComponent: () =>
      import('./layouts/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/settings/pages/admin-settings/admin-settings.component')
            .then(m => m.AdminSettingsComponent),
      },
      {
        path: 'sucursales',
        loadComponent: () =>
          import('./features/branches/pages/branches/branches.component')
            .then(m => m.BranchesPageComponent),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/admin-products/products-admin/products-admin.component')
            .then(m => m.ProductsAdminComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'configuracion' },
    ],
  }

];

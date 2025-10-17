import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path : '', component: Login },
    {
      path: 'admin',
      loadComponent: () => import('./layouts/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),      
      loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    },

];

import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path : '', component: Login },
    {
      path: 'superadmin',
      loadComponent: () => import('./layouts/superadmin-shell/superadmin-shell').then(m => m.SuperadminShell),
      loadChildren: () => import('./features/superadmin/superadmin.routes').then(m => m.SUPERADMIN_ROUTES),
    },
    {
      path: 'admin',
      loadComponent: () => import('./layouts/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),      
      loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    },
    {
      path:'gerente',
      loadComponent:() => import('./layouts/manager-shell/manager-shell.component').then(m => m.ManagerShellComponent),
      loadChildren: () => import('./features/manager/manager.routes').then(m => m.MANAGER_ROUTES),
    },
    {
      path:'mesero',
      loadComponent:() => import('./layouts/waiter-shell/waiter-shell').then(m => m.WaiterShellComponent),
      loadChildren: () => import('./features/waiter/waiter.routes').then(m => m.WAITER_ROUTES),
    },
    {
      path:'cajero',
      loadComponent:() => import('./layouts/cashier-shell/cashier-shell').then(m => m.CashierShell),
      loadChildren: () => import('./features/cashier/cashier.routes').then(m => m.CASHIER_ROUTES),
    }
];

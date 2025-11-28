import { Routes } from '@angular/router';
import { WaiterShellComponent } from '../../layouts/waiter-shell/waiter-shell';

export const WAITER_ROUTES: Routes = [
  {
    path: '',
    component: WaiterShellComponent, // EL LAYOUT PERMANENTE
    children: [
      {
        path: 'mesas',
        loadComponent: () =>
          import('./tables/tables').then((m) => m.Tables),
      },
      {
        path: 'comandas',
        loadComponent: () =>
          import('./orders/orders').then((m) => m.Orders),
      },
      {
        path: 'menu',
        loadComponent: () =>
          import('./menu/menu').then((m) => m.Menu),
      },
      { path: '', redirectTo: 'mesas', pathMatch: 'full' },
    ],
  },
];

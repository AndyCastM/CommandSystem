import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { AdminSettingsComponent } from './features/settings/pages/admin-settings/admin-settings.component';

export const routes: Routes = [
    { path : '', component: Login },
    {
    path: 'admin',
    loadComponent: () =>
      import('./layouts/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/pages/admin-settings/admin-settings.component')
            .then(m => m.AdminSettingsComponent),
      },
      {
        path: 'branches',
        loadComponent: () =>
          import('./features/branches/pages/branches/branches.component')
            .then(m => m.BranchesPageComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'configuracion' },
    ],
  }

];

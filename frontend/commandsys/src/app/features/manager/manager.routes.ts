import { Routes } from '@angular/router';
import { UsersPageComponent } from './users/pages/users-page.component';

export const MANAGER_ROUTES: Routes = [

    { path: 'usuarios', component: UsersPageComponent },
    // { path: 'productos', component: ProductsAdminComponent },
    // { path: 'configuracion', component: AdminSettingsComponent },

];

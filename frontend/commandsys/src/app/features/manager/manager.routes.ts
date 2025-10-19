import { Routes } from '@angular/router';
import { UsersPageComponent } from '../../shared/pages/users/pages/users-page.component';
import { ProductsComponent } from './products/products.component';
export const MANAGER_ROUTES: Routes = [

    { path: 'usuarios', component: UsersPageComponent },
    { path: 'productos', component: ProductsComponent },
    // { path: 'configuracion', component: AdminSettingsComponent },

];

import { Routes } from '@angular/router';
import { UsersPageComponent } from '../../shared/pages/users/pages/users-page.component';
import { ProductsComponent } from './products/products.component';
import { TablesComponent } from './tables/tables.component';

export const MANAGER_ROUTES: Routes = [

    { path: 'usuarios', component: UsersPageComponent },
    { path: 'productos', component: ProductsComponent },
    { path: 'mesas', component: TablesComponent},
    // { path: 'configuracion', component: AdminSettingsComponent },

];

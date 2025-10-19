import { Routes } from '@angular/router';
import { ProductsAdminComponent } from './admin-products/products-admin/products-admin.component';
import { UsersPageComponent } from '../../shared/pages/users/pages/users-page.component';
import { BranchesPageComponent } from './branches/pages/branches/branches.component';
import { AdminSettingsComponent } from './settings/pages/admin-settings/admin-settings.component';

export const ADMIN_ROUTES: Routes = [

    { path: 'usuarios', component: UsersPageComponent },
    { path: 'productos', component: ProductsAdminComponent },
    { path: 'sucursales', component: BranchesPageComponent },
    { path: 'configuracion', component: AdminSettingsComponent },

];

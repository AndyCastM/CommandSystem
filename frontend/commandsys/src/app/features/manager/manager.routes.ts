import { Routes } from '@angular/router';
import { UsersPageComponent } from '../../shared/pages/users/pages/users-page.component';
import { ProductsComponent } from './products/products.component';
import { TablesComponent } from './tables/tables.component';
import { ManagerSettings } from './manager-settings/manager-settings';
import { DashboardMetricsComponent } from './dashboard-metrics.component/dashboard-metrics.component';
import { PrinterConfigComponent } from './printer-config/printer-config';
import { CancellationsLogComponent } from './cancellations-log/cancellations-log';

export const MANAGER_ROUTES: Routes = [
    { path: 'dashboard', component: DashboardMetricsComponent },
    { path: 'usuarios', component: UsersPageComponent },
    { path: 'productos', component: ProductsComponent },
    { path: 'mesas', component: TablesComponent},
    { path: 'impresora', component: PrinterConfigComponent},
    { path: 'cancelaciones', component: CancellationsLogComponent},
    { path: 'configuracion', component: ManagerSettings },
];

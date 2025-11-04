import { Routes } from '@angular/router';
import { Tables } from './tables/tables';
import { Orders } from './orders/orders';
export const WAITER_ROUTES: Routes = [

    { path: 'mesas', component: Tables },
    { path: 'comandas', component: Orders },
];

import { Routes } from '@angular/router';
import { Tables } from './tables/tables';
import { Orders } from './orders/orders';
import { Menu } from './menu/menu';
export const WAITER_ROUTES: Routes = [

    { path: 'mesas', component: Tables },
    { path: 'comandas', component: Orders },
    {
        path: 'menu/:id_table',
        component: Menu,
    },
];

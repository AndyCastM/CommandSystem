import { Routes } from '@angular/router';
import { Tables } from './tables/tables';
import { Orders } from './orders/orders';
import { Menu } from './menu/menu';

export const WAITER_ROUTES: Routes = [
  { path: 'mesas', component: Tables },
  { path: 'comandas', component: Orders },

  //  ESTA ES LA ÚNICA RUTA DEL MENÚ
  // No se necesita params — el id_session viene por state
  { path: 'menu', component: Menu },
];

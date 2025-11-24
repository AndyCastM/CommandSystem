import { Routes } from '@angular/router';
import { CashRegisterComponent } from './cash-register.component/cash-register.component';

export const CASHIER_ROUTES: Routes = [
    { path: 'caja', component: CashRegisterComponent },
];
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrdersEventsService {
  
  private _refreshOrders$ = new Subject<void>();

  /** Observable para escuchar refrescos */
  refreshOrders$ = this._refreshOrders$.asObservable();

  /** Ejecutado desde el Shell cuando llega notificación */
  triggerRefresh() {
    this._refreshOrders$.next();
  }
}

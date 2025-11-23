import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { ToastService } from '../../../shared/UI/toast.service';

export interface TableAlert {
  table: string;
  guests: number;
  opened_at: string;
  message: string;
}

export interface ItemReadyAlert {
  order: number;
  table: number | null;
  product: string;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private socket!: Socket;
  private connected = false;

  private alerts$ = new BehaviorSubject<TableAlert | null>(null);
  private itemReady$ = new BehaviorSubject<ItemReadyAlert | null>(null);

  private apiUrl = 'http://localhost:3000';
  private _events$ = new BehaviorSubject<any>(null);
  public events$ = this._events$.asObservable();

  constructor(private zone: NgZone, private toast: ToastService) {}

  /** Inicia la conexión con el servidor WebSocket */
  connect() {
    if (this.connected) return;

    this.socket = io(`${this.apiUrl}`, {
      withCredentials: true,
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Conectado al servidor de notificaciones');
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.warn('Socket desconectado:', reason);
    });

    /** ===== ALERTA: mesa abierta +5 min ===== */
    this.socket.on('alert:table-open', (data: TableAlert) => {
      this.zone.run(() => {
        console.warn('ALERTA DE MESA:', data);
        this.toast.warning(data.message);
        this.alerts$.next(data);
      });
    });

    /** ===== PRODUCTO LISTO ===== */
    this.socket.on('order:item-ready', (data: ItemReadyAlert) => {
      this.zone.run(() => {
        console.log('PRODUCTO LISTO:', data);

        const msg = `${data.product} x${data.qty} ${
          data.table ? '• ' + data.table : ''
        } está listo`;

        this.toast.success(msg);
        this.itemReady$.next(data);
      });
    });

    /** ===== COMANDA ENTREGADA ===== */
    this.socket.on('order:delivered', (data) => {
      this.zone.run(() => {
        // Emitir a un observable o simplemente refrescar
        this.toast.info(`Comanda #${data.id_order} completada`);
        this._events$.next({ type: 'order-delivered', id: data.id_order });
      });
    });

  }
  
  /** Observable para alertas de mesa */
  onAlert() {
    return this.alerts$.asObservable();
  }

  /** Observable para productos listos */
  onItemReady() {
    return this.itemReady$.asObservable();
  }

  disconnect() {
    this.socket?.disconnect();
    this.connected = false;
  }
}

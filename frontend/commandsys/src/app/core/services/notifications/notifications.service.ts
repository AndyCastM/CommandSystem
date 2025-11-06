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

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private socket!: Socket;
  private connected = false;
  private alerts$ = new BehaviorSubject<TableAlert | null>(null);
  private apiUrl = 'http://localhost:3000';
  constructor(private zone: NgZone, private toast: ToastService) {}

  /** Inicia la conexión con el backend de sockets */
  connect() {
    if (this.connected) return;

    this.socket = io(`${this.apiUrl}`, {
      withCredentials: true, // necesario para enviar la cookie JWT
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

    // Escuchar alertas de mesas abiertas +5 min
    this.socket.on('alert:table-open', (data: TableAlert) => {
      this.zone.run(() => {
        console.warn('ALERTA DE MESA:', data);
        this.toast.warning(data.message); // muestra toast visual
        this.alerts$.next(data);
      });
    });
  }

  /** Observable para componentes que quieran reaccionar a alertas */
  onAlert() {
    return this.alerts$.asObservable();
  }

  disconnect() {
    this.socket?.disconnect();
    this.connected = false;
  }
}

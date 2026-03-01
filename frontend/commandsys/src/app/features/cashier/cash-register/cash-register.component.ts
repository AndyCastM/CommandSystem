import { Component, OnInit, inject, signal, computed, PLATFORM_ID,} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Servicios
import { CashService } from '../../../core/services/cash/cash.service';
import { PaymentsService } from '../../../core/services/payments/payments.service';
import { ToastService } from '../../../shared/UI/toast.service';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';

// Diálogos
import { OpenSessionDialog } from '../dialogs/open-session.dialog';
import { CloseSessionDialog } from '../dialogs/close-session.dialog';
import { MatIconModule } from '@angular/material/icon';

import { API_URL } from '../../../core/services/constants';

@Component({
  selector: 'app-cash-register',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  templateUrl: './cash-register.component.html',
  styleUrl: './cash-register.component.css',
})
export class CashRegisterComponent implements OnInit {
  private cashApi = inject(CashService);
  private paymentsApi = inject(PaymentsService);
  private notif = inject(NotificationsService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  private router = inject(Router);

  isBrowser = isPlatformBrowser(this.platformId);

  // Estado
  session = signal<any | null>(null);
  payments = signal<any[]>([]);
  pendingRequests = signal<any[]>([]);
  loading = signal(false);

  downloadTakeoutPrebill(req: any) {
    const url = API_URL + `/documents/prebill/takeout/${req.id_order}`;
    window.open(url, '_blank');
  }

  downloadTablePrebill(req: any) {
    const url = API_URL+ `/documents/prebill/table/${req.id_session}`;
    window.open(url, '_blank');
  }
  // ======================
  // LABELS Y ESTILOS
  // ======================

  paymentMethodLabel(method: string) {
    switch (method) {
      case 'cash':
        return 'Efectivo';
      case 'card':
        return 'Tarjeta';
      case 'transfer':
        return 'Transferencia';
      default:
        return method;
    }
  }

  methodClass(method: string) {
    switch (method) {
      case 'cash':
        return 'bg-emerald-100 text-emerald-700';
      case 'card':
        return 'bg-indigo-100 text-indigo-700';
      case 'transfer':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  // Totales computados
  totals = computed(() => {
    const arr = this.payments();

    const cash = arr
      .filter((p) => p.method === 'cash')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const card = arr
      .filter((p) => p.method === 'card')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const transfer = arr
      .filter((p) => p.method === 'transfer')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const tips = arr.reduce((acc, p) => acc + Number(p.tip ?? 0), 0);

    const sales = cash + card + transfer; //  Ventas totales del turno

    const expectedCash =
      Number(this.session()?.opening_amount || 0) + cash;

    return {
      cash,
      card,
      transfer,
      tips,
      sales,
      expectedCash,
    };
  });

  // ======================
  // FORMATEO DE FECHAS
  // ======================
  
  // ======================
// FORMATEO DE FECHAS
// ======================

  // ======================
// FORMATEO DE FECHAS
// ======================

formatDateTime(dateInput: string | Date): { date: string; time: string; full: string } {
  let localDate: Date;
  
  // Si ya es un objeto Date, usarlo directamente
  if (dateInput instanceof Date) {
    localDate = dateInput;
  } else {
    // Si es string, parsearlo
    const dateStr = dateInput.replace(' ', 'T');
    const date = new Date(dateStr);
    // Ajustar a hora local
    localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  }
  
  return {
    date: localDate.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
    time: localDate.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    full: localDate.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + localDate.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  };
}

  // ======================
  // INIT
  // ======================
  async ngOnInit() {
    if (!this.isBrowser) return;

    this.notif.connect();

    // Escuchar solicitudes de cuenta (prebill)
    this.notif.events$.subscribe((evt) => {
      if (!evt) return;
      if (evt.type === 'prebill') {
        // evt.data puede venir como:
        // mesas:  { type?: 'table', id_session, table, total, orders: number[], waiter_name?, ... }
        // takeout:{ type: 'takeout', id_order, customer_name, total, waiter_name?, ... }
        this.pendingRequests.update((list) => [...list, evt.data]);
        //console.log('NUEVA SOLICITUD DE CUENTA:', evt.data);
      }
    });

    await this.loadSession();

    if (!this.session()) {
      this.openOpeningModal();
      return;
    }

    await this.loadPayments();
    await this.loadPendingPrebillsFromApi();
  }

  // ======================
  // LOADERS
  // ======================

  async loadSession() {
    const sessionData = await this.cashApi.getActiveSession();
    
    if (sessionData) {
      // Formatear la fecha de apertura
      const formatted = this.formatDateTime(sessionData.opened_at);
      
      this.session.set({
        ...sessionData,
        formattedOpenedAt: formatted.full
      });
    } else {
      this.session.set(null);
    }
  }

  async loadPayments() {
    const s = this.session();
    if (!s) return;

    const res = await this.paymentsApi.getPaymentsByCash(s.id_cash_session);
    const data = Array.isArray(res) ? res : ((res as any)?.data ?? []);
    
    // Formatear las fechas de cada pago
    const formattedPayments = data.map((payment: any) => {
      const formatted = this.formatDateTime(payment.created_at);
      
      return {
        ...payment,
        formattedDate: formatted.date,
        formattedTime: formatted.time
      };
    });
    
    this.payments.set(formattedPayments);
  }

  async loadPendingPrebillsFromApi() {
    try {
      const res = await this.paymentsApi.getPendingPrebills();
      const data = Array.isArray(res) ? res : (res as any)?.data ?? [];
      this.pendingRequests.set(data);
    } catch (err) {
      console.error('Error cargando cuentas pendientes', err);
    }
  }

  async refreshData() {
    await this.loadSession();
    await this.loadPayments();
  }

  // ======================
  // APERTURA / CIERRE
  // ======================

  // ABRIR TURNO
  openOpeningModal() {
    const ref = this.dialog.open(OpenSessionDialog, {
      width: '420px',
      disableClose: true,
    });

    ref.afterClosed().subscribe(async (amount) => {
      if (!amount) return;

      await this.cashApi.openSession({ opening_amount: amount });
      this.toast.success('Turno de caja abierto');

      await this.refreshData();
    });
  }

// CERRAR TURNO
askClose() {
  const currentSession = this.session();

  if (!currentSession) {
    this.toast.error('No hay un turno de caja activo.');
    return;
  }

  const totals = this.totals();

  const ref = this.dialog.open(CloseSessionDialog, {
    width: '380px',
    disableClose: true,
    data: {
      totals,
    },
  });

  ref.afterClosed().subscribe(async (counted: number | null) => {
    if (counted == null) return;

    try {
      this.loading.set(true);

      // Cierra turno en backend
      await this.cashApi.closeSession({ counted_amount: counted });
      this.toast.success('Turno cerrado correctamente');

      // Limpia estado local
      this.session.set(null);
      this.payments.set([]);

      // REDIRIGE AL LOGIN
      this.router.navigate(['/']);

    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo cerrar el turno');
    } finally {
      this.loading.set(false);
    }
  });
}

  // ======================
  // MANEJO DE CUENTAS SOLICITADAS
  // ======================

  /**
   * Handler general del botón en "Cuentas solicitadas"
   * Decide si es mesa (table) o para llevar (takeout)
   */
  onRequestClick(req: any) {
    const type = req.type ?? 'table';

    if (type === 'takeout') {
      this.openTakeoutPaymentDialog(req);
    } else {
      this.openSessionPaymentDialog(req);
    }
  }

  // -------- PAGO POR SESIÓN (MESAS) --------
  async openSessionPaymentDialog(req: any) {
    try {
      this.loading.set(true);

      //console.log('Abriendo dialogo de pago por sesión:', req);

      const dialogModule = await import('../dialogs/order-payment/order-payment.dialog');

      const ref = this.dialog.open(dialogModule.OrderPaymentDialog, {
        width: '460px',
        data: {
          id_session: req.id_session,
          id_orders: req.orders, // array de comandas de esa sesión
          total: req.total,
          table: req.table,
          type: 'table',
        },
      });

      ref.afterClosed().subscribe(async (result) => {
        if (!result) return;

        // Reinyectamos los IDs y tipo para que processSessionPayment tenga todo
        const payloadConIds = {
          ...result,
          id_session: req.id_session,
          id_orders: req.orders,
          type: 'table',
        };

        await this.processSessionPayment(payloadConIds);
      });
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo cargar la sesión');
    } finally {
      this.loading.set(false);
    }
  }

  // -------- PAGO POR ORDEN ÚNICA (TAKEOUT) --------
  async openTakeoutPaymentDialog(req: any) {
    try {
      this.loading.set(true);

      //console.log('Abriendo dialogo de pago para llevar:', req);

      const dialogModule = await import('../dialogs/order-payment/order-payment.dialog');

      const ref = this.dialog.open(dialogModule.OrderPaymentDialog, {
        width: '460px',
        data: {
          id_order: req.id_order,
          total: req.total,
          customer_name: req.customer_name,
          type: 'takeout',
        },
      });

      ref.afterClosed().subscribe(async (result) => {
        if (!result) return;

        const payloadConIds = {
          ...result,
          id_order: req.id_order,
          type: 'takeout',
        };

        await this.processSessionPayment(payloadConIds);
      });
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo cargar la orden');
    } finally {
      this.loading.set(false);
    }
  }

  // -------- PROCESAR PAGO (MESA O TAKEOUT) --------
  async processSessionPayment(result: any) {
    try {
      this.loading.set(true);

      const payments = result.payments as {
        method: 'cash' | 'card' | 'transfer';
        amount: number;
      }[];

      if (!payments || payments.length === 0) {
        this.toast.error('No se recibió información de pagos');
        return;
      }

      // Base del payload: por sesión (id_orders) o por orden (id_order)
      const basePayload: any =
        result.id_orders && result.id_orders.length
          ? { id_orders: result.id_orders } // pago por sesión (mesa)
          : { id_order: result.id_order };   // pago por orden única (takeout)

      let tipPending = result.tip ?? 0;

      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];

        await this.paymentsApi.createPayment({
          ...basePayload,
          method: p.method,
          amount: p.amount,
          tip: i === 0 ? tipPending : 0, // solo la primera vez
        });
      }

      this.toast.success('Pago registrado');

      // Quitar la solicitud atendida según el tipo
      this.pendingRequests.update((list) => {
        // mesa: filtramos por id_session
        if (result.id_orders && result.id_orders.length) {
          return list.filter((x) => x.id_session !== result.id_session);
        }

        // takeout: filtramos por id_order
        return list.filter((x) => x.id_order !== result.id_order);
      });

      await this.refreshData();
    } catch (err) {
      console.error(err);
      this.toast.error('Error al registrar el pago');
    } finally {
      this.loading.set(false);
    }
  }
}
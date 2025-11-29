import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

// Servicios
import { CashService } from '../../../core/services/cash/cash.service';
import { PaymentsService } from '../../../core/services/payments/payments.service';
import { ToastService } from '../../../shared/UI/toast.service';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';

// Diálogos
import { OpenSessionDialog } from '../dialogs/open-session.dialog';
import { CloseSessionDialog } from '../dialogs/close-session.dialog';
import { MatIconModule } from '@angular/material/icon';

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

  isBrowser = isPlatformBrowser(this.platformId);

  // Estado
  session = signal<any | null>(null);
  payments = signal<any[]>([]);
  pendingRequests = signal<any[]>([]);
  loading = signal(false);
  
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
  // INIT
  // ======================
  async ngOnInit() {
    if (!this.isBrowser) return;

    this.notif.connect();

    // Escuchar solicitudes de pre-cuenta
    this.notif.events$.subscribe((evt) => {
      if (!evt) return;
      if (evt.type === 'prebill') {
        // evt.data viene del backend: { id_session, table, total, orders: number[], by }
        this.pendingRequests.update((list) => [...list, evt.data]);
        console.log('NUEVA SOLICITUD DE PRE-CUENTA:', evt.data);
      }
    });

    await this.loadSession();

    if (!this.session()) {
      this.openOpeningModal();
      return;
    }

    await this.loadPayments();
  }

  // ======================
  // LOADERS
  // ======================

  async loadSession() {
    this.session.set(await this.cashApi.getActiveSession());
  }

  async loadPayments() {
    const s = this.session();
    if (!s) return;

    const res = await this.paymentsApi.getPaymentsByCash(s.id_cash_session);
    const data = Array.isArray(res) ? res : ((res as any)?.data ?? []);
    this.payments.set(data as any[]);
  }

  async refreshData() {
    await this.loadSession();
    await this.loadPayments();
  }

  // ======================
  // ABRIR TURNO
  // ======================
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

    const totals = this.totals(); //  ya trae cash, card, transfer, sales, expectedCash, etc.

    const ref = this.dialog.open(CloseSessionDialog, {
      width: '380px',
      disableClose: true,
      data: {
        totals,
      },
    });

    ref.afterClosed().subscribe(async (counted: number | null) => {
      // Si canceló el diálogo
      if (counted == null) return;

      try {
        this.loading.set(true);

        // Enviar el cierre al backend
        await this.cashApi.closeSession({ counted_amount: counted });
        this.toast.success('Turno cerrado correctamente');

        // Limpiar estado local y refrescar
        this.session.set(null);
        this.payments.set([]);

        // Si quieres que inmediatamente abra el modal de apertura del siguiente turno:
        this.openOpeningModal();
      } catch (err) {
        console.error(err);
        this.toast.error('No se pudo cerrar el turno');
      } finally {
        this.loading.set(false);
      }
    });
  }

  // PAGO POR SESIÓN (MESA)
  async openSessionPaymentDialog(req: any) {
    try {
      this.loading.set(true);

      console.log('Abriendo dialogo de pago por sesión:', req);

      const ref = this.dialog.open(
        (await import('../dialogs/order-payment/order-payment.dialog'))
          .OrderPaymentDialog,
        {
          width: '460px',
          data: {
            id_session: req.id_session,
            id_orders: req.orders, // array de comandas de esa sesión
            total: req.total,
            table: req.table,
          },
        }
      );

      ref.afterClosed().subscribe(async (result) => {
        if (!result) return;
        await this.processSessionPayment(result);
      });
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo cargar la sesión');
    } finally {
      this.loading.set(false);
    }
  }

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
      const basePayload: any = result.id_orders && result.id_orders.length
        ? { id_orders: result.id_orders }  // pago por sesión
        : { id_order: result.id_order };   // fallback por orden

      // Tip SOLO la mandamos en el primer pago para no duplicarla
      let tipPending = result.tip ?? 0;

      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];

        await this.paymentsApi.createPayment({
          ...basePayload,
          method: p.method,
          amount: p.amount,
          tip: i === 0 ? tipPending : 0, // solo en el primero
        });
      }

      this.toast.success('Pago registrado');

      // Quitar la solicitud atendida por sesión
      this.pendingRequests.update((list) =>
        list.filter((x) => x.id_session !== result.id_session)
      );

      await this.refreshData();
    } catch (err) {
      console.error(err);
      this.toast.error('Error al registrar el pago');
    } finally {
      this.loading.set(false);
    }
  }

}

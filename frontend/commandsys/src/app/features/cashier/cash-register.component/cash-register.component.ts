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
import {  MatIconModule } from '@angular/material/icon';

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

  // Totales computados
  totals = computed(() => {
    const arr = this.payments();

    return {
      cash: arr
        .filter((p) => p.method === 'cash')
        .reduce((acc, p) => acc + Number(p.amount), 0),

      card: arr
        .filter((p) => p.method === 'card')
        .reduce((acc, p) => acc + Number(p.amount), 0),

      transfer: arr
        .filter((p) => p.method === 'transfer')
        .reduce((acc, p) => acc + Number(p.amount), 0),

      tips: arr.reduce((acc, p) => acc + Number(p.tip ?? 0), 0),

      expected:
        Number(this.session()?.opening_amount || 0) +
        arr
          .filter((p) => p.method === 'cash')
          .reduce((acc, p) => acc + Number(p.amount), 0),
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

  // ======================
  // CERRAR TURNO
  // ======================
  askClose() {
    const ref = this.dialog.open(CloseSessionDialog, {
      width: '420px',
      disableClose: true,
      data: {
        totals: this.totals(),
      },
    });

    ref.afterClosed().subscribe(async (counted) => {
      if (counted == null) return;

      await this.cashApi.closeSession({ counted_amount: counted });
      this.toast.success('Turno cerrado correctamente');

      this.session.set(null);
      this.openOpeningModal();
    });
  }

  // ======================
  // PAGO DE UNA ORDEN
  // ======================

  async openPaymentDialog(id_order: number) {
    try {
      this.loading.set(true);

      // Cargar detalle de la orden
      const order = await this.paymentsApi.getOrderDetail(id_order);

      const ref = this.dialog.open(
        (await import('../dialogs/order-payment/order-payment.dialog')).OrderPaymentDialog,
        {
          width: '460px',
          data: {
            id_order,
            total: order.total,
          },
        }
      );

      ref.afterClosed().subscribe(async (result) => {
        if (!result) return;
        await this.processPayment(result);
      });
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo cargar la orden');
    } finally {
      this.loading.set(false);
    }
  }

  async processPayment(result: any) {
    try {
      this.loading.set(true);

      await this.paymentsApi.createPayment({
        id_order: result.id_order,
        method: result.method,
        amount: result.amount,
        tip: result.tip,
      });

      this.toast.success('Pago registrado');

      // Quitar la solicitud atendida
      this.pendingRequests.update((list) =>
        list.filter((x) => x.id_order !== result.id_order)
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

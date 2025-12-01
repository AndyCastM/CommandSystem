import { Component, OnInit, inject, signal, computed, PLATFORM_ID} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../shared/UI/toast.service';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';
import { Subscription } from 'rxjs';
import { TablesService } from '../../../core/services/tables/tables.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { OpenTableDialogComponent } from '../../../shared/modals/open-table-dialog/open-table-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { TableAlert } from '../../../core/services/notifications/notifications.service';
import { Router } from '@angular/router';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/select';
import { TableLocationsService } from '../../../core/services/tables/table-locations.service';
import { AuthService } from '../../../auth/services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { OrderService } from '../../../core/services/orders/orders.service';
import { SessionSummary } from '../UI/session-summary/session-summary';

@Component({
  selector: 'app-tables',
  imports: [
    CommonModule,
    MatIconModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatSelect,
    MatOption,
  ],
  templateUrl: './tables.html',
  styleUrl: './tables.css',
})
export class Tables implements OnInit {
  private toast = inject(ToastService);
  private notif = inject(NotificationsService);
  private sub?: Subscription;
  private tablesService = inject(TablesService);
  private locationsService = inject(TableLocationsService);
  private dialog = inject(MatDialog);
  private auth = inject(AuthService);
  private ordersApi = inject(OrderService);

  private router = inject(Router);

  loading = signal(false);
  tables = signal<any[]>([]);
  locations = this.locationsService.locations;

  selectedStatus = signal<string | null>(null);
  selectedLocation = signal<string | null>(null);

  lastAlert?: TableAlert;

  // ===========================
  //  FUNCION CLAVE
  // ===========================
  isMyTable(table: any): boolean {
    // auth.currentUser can be a function (that returns a signal or user), a signal (callable), or a user object.
    // Handle all cases safely.
    const maybe = (typeof (this.auth.currentUser as any) === 'function')
      ? (this.auth.currentUser as any)()
      : (this.auth.currentUser ?? null);

    const user = typeof maybe === 'function' ? (maybe as any)() : maybe;

    if (!user) return false;
    //console.log(table);
    //console.log('Comparando mesa usuario:', table.id_user, 'con usuario actual:', user.id_user);
    return table.id_user === user.id_user;
  }

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  now = signal<number>(Date.now());
  private timerId: any = null;

  async ngOnInit() {
    if (!this.isBrowser) return;

    // Reloj que se actualiza cada minuto
    this.timerId = setInterval(() => {
      this.now.set(Date.now());
    }, 60_000); // 60 segundos, puedes bajar a 10_000 si quieres más preciso

    this.loading.set(true);
    this.locationsService.loadAll().subscribe();

    try {
      const data = await this.tablesService.getTablesByBranch();
      this.tables.set(data);
    } catch (err) {
      console.error(err);
      this.toast.error('Error al cargar las mesas');
    } finally {
      this.loading.set(false);
    }

    // Socket
    // this.notif.connect();

    // this.sub = this.notif.onAlert().subscribe((alert) => {
    //   if (alert) this.lastAlert = alert;
    // });
  }

  // ===========================
  // FILTROS
  // ===========================
  filteredTables = computed(() => {
    const allTables = this.tables();
    const status = this.selectedStatus();
    const location = this.selectedLocation();

    return allTables.filter((t) => {
      const matchStatus = status ? t.status === status : true;
      const matchLocation = location ? t.location === location : true;
      return matchStatus && matchLocation;
    })
    .map((t) => {
      const openedAt = t.opened_at || null;

      let timeLabel: string | null = null;

      if (
        openedAt &&
        (t.status === 'Abierta' ||
          t.status === 'Ocupada' ||
          t.status === 'Pendiente de pago')
      ) {
        timeLabel = this.formatElapsed(openedAt, this.now());
      }

      // devolvemos el mismo objeto + time (no modificamos el original)
      return {
        ...t,
        time: timeLabel,
      };
    });
  });

  private formatElapsed(start: string | Date, nowMs: number): string {
    let startMs: number;

    if (start instanceof Date) {
      startMs = start.getTime();
    } else {
      // Si es string, crear Date directamente (interpreta como local si no tiene Z)
      // Si viene con formato ISO pero sin 'Z', lo trata como local
      const dateStr = String(start);
      
      // Si la fecha viene del backend sin zona horaria, asumimos que es local
      // Removemos 'Z' si existe para forzar interpretación local
      const localDateStr = dateStr.endsWith('Z') ? dateStr.slice(0, -1) : dateStr;
      startMs = new Date(localDateStr).getTime();
    }

    if (isNaN(startMs)) return '';

    const diff = nowMs - startMs;
    if (diff < 0) return '';

    const totalMinutes = Math.floor(diff / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (totalMinutes < 1) return 'Hace menos de 1 min';
    if (totalMinutes < 60) return `Hace ${totalMinutes} min`;
    if (minutes === 0) return `Hace ${hours} h`;
    return `Hace ${hours} h ${minutes} min`;
  }

  filterByStatus(event: any) {
    const value = event.value;
    this.selectedStatus.set(value || null);
  }

  filterByLocation(event: any) {
    const value = event.value;
    this.selectedLocation.set(value || null);
  }

  async reloadTables() {
    try {
      const data = await this.tablesService.getTablesByBranch();
      this.tables.set(data);
    } catch {
      this.toast.error('Error al actualizar las mesas');
    }
  }

  // ===========================
  // ACCIONES DE MESAS
  // ===========================

  async openTable(table: any) {
    const dialog = this.dialog.open(OpenTableDialogComponent, {
      width: '420px',
      data: { table },
    });

    dialog.afterClosed().subscribe(async (guests) => {
      if (!guests) return;

      try {
        const res = await this.tablesService.openTable(table.id, guests);
        this.toast.success(res.message);

        await this.reloadTables();
      } catch (err: any) {
        console.error(err);
        this.toast.error(err.error?.message || 'Error al abrir la mesa');
      }
    });
  }

  async takeOrder(table: any) {
    if (!this.isMyTable(table)) {
      return this.toast.error('No puedes tomar la comanda de otra mesa');
    }

    try {
      const res = await this.tablesService.occupyTable(table.id);
      const session = res.data;
      this.toast.success(res.message);

      this.router.navigate(['/mesero/menu'], {
        state: {
          id_session: session.id_session,
          type: 'dine_in',
        },
      });

      await this.reloadTables();
    } catch (err: any) {
      console.error(err);
      this.toast.error(err.error?.message || 'Error al ocupar la mesa');
    }
  }

  async retakeOrder(table: any) {
    if (!this.isMyTable(table)) {
      return this.toast.error('No puedes agregar a una mesa que no es tuya');
    }

    try {
      const res = await this.tablesService.openTable(
        table.id,
        table.guests ?? 1
      );
      const session = res.data;

      this.router.navigate(['/mesero/menu'], {
        state: {
          id_session: session.id_session,
          type: 'dine_in',
        },
      });
    } catch (err: any) {
      console.error(err);
      this.toast.error(err.error?.message || 'Error al retomar la mesa');
    }
  }

  viewOrder(table: any) {
    this.toast.info(`Viendo comanda de ${table.name}`);
  }

  async releaseTable(table: any) {
    if (!this.isMyTable(table)) {
      return this.toast.error('Solo el mesero asignado puede liberar la mesa');
    }

    try {
      const res = await this.tablesService.closeTable(table.id);
      this.toast.success(res.message);
      await this.reloadTables();
    } catch (err: any) {
      console.error(err);
      this.toast.error(err.error?.message || 'Error al liberar la mesa');
    }
  }

  async releaseEmptyTable(table:any){
    if (!this.isMyTable(table)) {
      return this.toast.error('Solo el mesero asignado puede liberar la mesa');
    }

    try {
      const res = await this.tablesService.releaseEmptyTable(table.id);
      this.toast.success(res.message);
      await this.reloadTables();
    } catch (err: any) {
      console.error(err);
      this.toast.error(err.error?.message || 'Error al liberar la mesa');
    }
  }

  async requestPrebill(table: any) {
    console.log("SESSIONNN:", table.id_session);

    if (!table?.id_session) {
      this.toast.error('No se pudo identificar la mesa.');
      return;
    }

    if (table.status !== 'Ocupada') {
      this.toast.warning('Solo puedes solicitar pre-cuenta de mesas ocupadas.');
      return;
    }

    try {
      // Verificar el resumen de la sesión (mesa)
      const summary = await this.ordersApi.getSessionSummary(table.id_session);

      // Si la mesa tiene productos pendientes, no se puede solicitar la pre-cuenta
      if (!summary.canRequestPrebill) {
        this.toast.warning(`Aún hay ${summary.pendingCount} producto(s) sin entregar.`);
        return;
      }

      if (summary.items.length === 0){
        this.toast.warning('La sesion no tiene ninguna comanda activa');
        return;
      }
      // Si todo está bien, solicitamos la pre-cuenta
      await this.ordersApi.requestPrebill(table.id_session);
      this.toast.success(`Se solicitó la pre-cuenta de la mesa ${table.name}`);
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo enviar la solicitud a caja.');
    }
  }

  // Método para ver el consumo de la mesa
  async viewSessionSummary(table: any) {
    try {
      // Llamar al servicio para obtener el resumen de la mesa
      const summary = await this.ordersApi.getSessionSummary(table.id_session);

      // Abrir el diálogo con los detalles
      this.dialog.open(SessionSummary, {
        width: '480px',
        data: summary, // Pasa el resumen de la mesa
      });
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo cargar el resumen de la mesa');
    }
  }
}
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
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
export class Tables implements OnInit, OnDestroy {
  private toast = inject(ToastService);
  private notif = inject(NotificationsService);
  private sub?: Subscription;
  private tablesService = inject(TablesService);
  private locationsService = inject(TableLocationsService);
  private dialog = inject(MatDialog);
  private auth = inject(AuthService);

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
    console.log(table);
    console.log('Comparando mesa usuario:', table.id_user, 'con usuario actual:', user.id_user);
    return table.id_user === user.id_user;
  }

  // ===========================
  // INIT
  // ===========================
  async ngOnInit() {
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
    this.notif.connect();

    this.sub = this.notif.onAlert().subscribe((alert) => {
      if (alert) this.lastAlert = alert;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.notif.disconnect();
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
    });
  });

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
}

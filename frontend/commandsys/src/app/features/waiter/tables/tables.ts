import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../shared/UI/toast.service';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';
import { Subscription } from 'rxjs';
import { TablesService } from '../../../core/services/tables/tables.service';

@Component({
  selector: 'app-tables',
  imports: [CommonModule, MatIconModule],
  templateUrl: './tables.html',
  styleUrl: './tables.css',
})
export class Tables implements OnInit, OnDestroy{ 
  private toast = inject(ToastService);
  private notif = inject(NotificationsService);
  private sub?: Subscription;
  private tablesService = inject(TablesService);

  loading = signal(false);
  tables = signal<any[]>([]);

  async ngOnInit() {
    this.loading.set(true);

    try {
      const data = await this.tablesService.getTablesByBranch();
      this.tables.set(data);
      console.log('Mesas cargadas:', data);
    } catch (err) {
      console.error(err);
      this.toast.error('Error al cargar las mesas');
    } finally {
      this.loading.set(false);
    }

    //  Conecta al socket
    this.notif.connect();

    //  Reacciona a alertas si quieres actualizar UI además del toast
    this.sub = this.notif.onAlert().subscribe((alert) => {
      if (alert) {
        console.log(' Mesa abierta más de 5 min:', alert.table);
        // ejemplo: refrescar lista de mesas si es necesario
        // this.loadTables();
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.notif.disconnect();
  }

  openTable(table: any) {
    this.toast.success(`Mesa ${table.id} abierta`);
  }

  takeOrder(table: any) {
    this.toast.info(`Tomando comanda en ${table.name}`);
  }

  viewOrder(table: any) {
    this.toast.info(`Viendo comanda de ${table.name}`);
  }

  releaseTable(table: any) {
    this.toast.warning(`Liberando ${table.name}`);
  }

}

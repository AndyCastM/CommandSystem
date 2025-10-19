import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TableLocationsService } from '../../../core/services/tables/table-locations.service';
import { TablesService } from '../../../core/services/tables/tables.service';
import { ToastService } from '../../../shared/UI/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { LocationFormDialogComponent } from './UI/location-form-dialog/location-form-dialog.component';
import { TableFormDialogComponent } from './UI/table-form-dialog/table-form-dialog.component';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatIconModule],
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.css',
})
export class TablesComponent implements OnInit {
  private locSrv = inject(TableLocationsService);
  private tblSrv = inject(TablesService);
  toast = inject(ToastService);

  private dialog = inject(MatDialog);

  selectedLocation = signal<'Todas' | string>('Todas');

  locations = this.locSrv.locations;
  tables = this.tblSrv.tables;

  ngOnInit() {
    this.locSrv.loadAll().subscribe();
    this.tblSrv.loadAll().subscribe({
      next: (res) => console.log(' Mesas cargadas:', res),
    });
  }

  filteredTables = computed(() => {
    const loc = this.selectedLocation();
    return this.tables().filter(t => loc === 'Todas' || this.getLocationName(t.id_location) === loc);
  });

  metrics = computed(() => {
    const all = this.tables();
    return {
      total: all.length,
      active: all.filter(t => t.is_active == 1).length,
      inactive: all.filter(t => t.is_active == 0).length,
    };
  });


  getLocationName(id: number) {
    return this.locations().find(l => l.id_location === id)?.name ?? 'Sin localización';
  }

  openCreateLocation() {
    const ref = this.dialog.open(LocationFormDialogComponent, {
      data: { mode: 'create' },
      width: '420px',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((ok) => ok && this.locSrv.loadAll().subscribe());
  }

  openCreateTable() {
    const ref = this.dialog.open(TableFormDialogComponent, {
      data: { mode: 'create' },
      width: '420px',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((ok) => ok && this.tblSrv.loadAll().subscribe());
  }

  toggleStatus(t: any) {
    if (t.is_active === 1) {
      this.tblSrv.deactivate(t.id_table).subscribe();
      this.toast.info('Mesa desactivada');
    } else {
      this.tblSrv.activate(t.id_table).subscribe();
      this.toast.success('Mesa activada');
    }
  }

  trackById = (_: number, t: any) => t.id_table;
 }

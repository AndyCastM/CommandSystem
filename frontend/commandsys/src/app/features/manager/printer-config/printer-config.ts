import {
  Component,
  OnInit,
  signal,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrinterService } from '../../../core/services/printer/printer.service';
import { Area, PrinterConfig } from '../../../core/services/printer/printers.model';
import { ToastService } from '../../../shared/UI/toast.service';
import { MatIconModule } from '@angular/material/icon';
import { PrinterEditModalComponent } from './UI/printer-edit-modal/printer-edit-modal.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-printer-config',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf, MatIconModule, PrinterEditModalComponent],
  templateUrl: './printer-config.html',
})
export class PrinterConfigComponent implements OnInit {

  private printerApi = inject(PrinterService);
  private toast = inject(ToastService);

  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  loading = signal(false);
  areasSig = signal<Area[]>([]);
  printersSig = signal<PrinterConfig[]>([]);

  form = signal({
    displayName: '',
    printerIp: 'USB',      // por defecto USB
    areaIds: [] as number[]
  });

  ngOnInit() {
    if (!this.isBrowser) return;
    this.loadAreas();
    this.loadStations();
  }

  loadAreas() {
    this.loading.set(true);
    this.printerApi.getAreas().subscribe({
      next: (areas) => {
        this.areasSig.set(areas);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('No se pudieron cargar las áreas');
        this.loading.set(false);
      }
    });
  }

  loadStations() {
    this.printerApi.getStations().subscribe({
      next: (printers) => this.printersSig.set(printers),
      error: (err) => {
        console.error(' Error en loadStations:', err);
        this.toast.error('Error cargando impresoras');
      }
    });
  }

  toggleArea(idArea: number, checked: boolean) {
    const arr = [...this.form().areaIds];

    if (checked) arr.push(idArea);
    else arr.splice(arr.indexOf(idArea), 1);

    this.form.update(f => ({ ...f, areaIds: arr }));
  }

  save() {
    const f = this.form();

    if (!f.displayName || f.areaIds.length === 0) {
      this.toast.error('Completa todos los campos');
      return;
    }

    this.printerApi.upsertPrinter({
      displayName: f.displayName,
      printerIp: 'USB',
      areaIds: f.areaIds
    }).subscribe({
      next: () => {
        this.toast.success('Impresora guardada');
        this.resetForm();
        this.loadStations();
      },
      error: (err) => {
        console.error(' Error guardando:', err);
        this.toast.error('Error en guardar');
      }
    });
  }

  resetForm() {
    this.form.set({
      displayName: '',
      printerIp: 'USB',
      areaIds: []
    });
  }

  getAreaNames(printer: { areas: Area[] }) {
    if (!printer || !printer.areas) return '';
    return printer.areas.map((a) => a.name).join(', ');
  }

  editModalOpen = signal(false);
  editingPrinter = signal<PrinterConfig | null>(null);

  openEditModal(p: PrinterConfig) {
    this.editingPrinter.set(p);
    this.editModalOpen.set(true);
  }

  closeEdit() {
    this.editModalOpen.set(false);
    this.editingPrinter.set(null);
  }

  /** Guardar los cambios recibidos del modal */
  updatePrinter(data: { displayName: string; areaIds: number[] }) {
    this.printerApi.upsertPrinter({
      displayName: data.displayName,
      printerIp: 'USB',
      areaIds: data.areaIds,
      ids_station: this.editingPrinter()?.ids_station || [],
    }).subscribe({
      next: () => {
        this.toast.success("Impresora actualizada");
        this.closeEdit();
        this.loadStations();
      },
      error: () => this.toast.error("No se pudo actualizar")
    });
  }

  deactivate(id: number){
    this.printerApi.deactivatePrinter(id).subscribe({
      next: () => {
        this.toast.success("Configuración de impresora desactivada");
        this.loadStations();
      },
      error: () =>  this.toast.error("No se pudo completar la acción")
    });
  }

  deactivateMany(ids: number[]) {
    this.printerApi.deactivateMany(ids).subscribe({
      next: () => {
        this.toast.success("Impresora desactivada");
        this.loadStations();
      },
      error: () => this.toast.error("Error al desactivar impresora")
    });
  }

  toggleActive(p: PrinterConfig) {
    if (!p.ids_station?.length) return;

    // si está activa → desactivar
    if (p.isActive === 1) {
      this.printerApi.deactivateMany(p.ids_station).subscribe({
        next: () => {
          this.toast.success("Impresora desactivada");
          this.loadStations();
        },
        error: () => this.toast.error("Error al desactivar")
      });
    }

    // si está inactiva → activar
    else {
      this.printerApi.activateMany(p.ids_station).subscribe({
        next: () => {
          this.toast.success("Impresora activada");
          this.loadStations();
        },
        error: () => this.toast.error("Error al activar")
      });
    }
  }

}


import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../shared/UI/toast.service';

@Component({
  selector: 'app-tables',
  imports: [CommonModule, MatIconModule],
  templateUrl: './tables.html',
  styleUrl: './tables.css',
})
export class Tables { 
  private toast = inject(ToastService);

  loading = signal(false);
  tables = signal<any[]>([]);

  async ngOnInit() {
    // 🔹 Aquí luego conectarás a tu API de mesas
    this.tables.set([
      { id: 1, name: 'Mesa 1', seats: 2, location: 'Terraza', status: 'Disponible' },
      { id: 2, name: 'Mesa 2', seats: 4, location: 'Piso 1', status: 'Abierta', time: 'Recién abierta' },
      { id: 3, name: 'Mesa 3', seats: 8, location: 'Piso 1', status: 'Ocupada' },
      { id: 4, name: 'Mesa 4', seats: 4, location: 'Piso 2', status: 'Disponible' },
      { id: 7, name: 'Mesa 7', seats: 6, location: 'Terraza', status: 'Abierta', time: '5 min' },
      { id: 8, name: 'Mesa 8', seats: 3, location: 'Piso 2', status: 'Ocupada' },
      { id: 9, name: 'Mesa 9', seats: 2, location: 'Piso 1', status: 'Ocupada' },
    ]);
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

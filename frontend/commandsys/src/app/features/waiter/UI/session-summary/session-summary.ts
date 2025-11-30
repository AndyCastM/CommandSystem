import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

type ItemStatus = 'pending' | 'in_preparation' | 'ready' | 'delivered' | 'cancelled';

export interface SessionSummaryItem {
  id_order_item: number;
  id_order: number;
  status: ItemStatus;
  subtotal: number;
  created_at?: string | Date | null;
  product_name: string;
}

export interface SessionSummaryData {
  id_session: number;
  table: string;
  total: number;
  deliveredTotal: number;
  pendingCount: number;
  canRequestPrebill: boolean;
  items: SessionSummaryItem[];
}

@Component({
  selector: 'app-session-summary',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  templateUrl: './session-summary.html',
})
export class SessionSummary {
  constructor(
    private ref: MatDialogRef<SessionSummary>,
    @Inject(MAT_DIALOG_DATA) public data: SessionSummaryData
  ) {}

  get hasPending(): boolean {
    return this.data.pendingCount > 0;
  }

  get pendingItems(): SessionSummaryItem[] {
    return this.data.items.filter(
      (i) => i.status !== 'delivered' && i.status !== 'cancelled'
    );
  }

  get deliveredItems(): SessionSummaryItem[] {
    return this.data.items.filter((i) => i.status === 'delivered');
  }

  /**
   * Formatea la fecha/hora para mostrar correctamente
   * Asume que created_at viene en formato: "2025-11-29 01:04:55"
   */
  formatTime(created_at?: string | Date | null): string {
    if (!created_at) return '--:--';
    
    try {
      // Convertir string a Date si es necesario
      let dateStr = typeof created_at === 'string' ? created_at : created_at.toISOString();
      
      // Reemplazar espacio por T para formato ISO
      dateStr = dateStr.replace(' ', 'T');
      
      // Parsear como UTC
      const date = new Date(dateStr);
      
      // Ajustar a hora local
      const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
      
      // Formatear hora
      return localDate.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return '--:--';
    }
  }

  statusLabel(status: ItemStatus): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_preparation':
        return 'En preparación';
      case 'ready':
        return 'Listo';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  statusBadgeClass(status: ItemStatus): string {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'in_preparation':
        return 'bg-blue-100 text-blue-700';
      case 'ready':
        return 'bg-indigo-100 text-indigo-700';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700';
      case 'cancelled':
        return 'bg-rose-100 text-rose-700 line-through';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  close() {
    this.ref.close();
  }
}
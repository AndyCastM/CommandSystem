import {
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe, NgIf, NgFor, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MetricsService,
  CancellationLog,
} from '../../../core/services/metrics/metrics.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-cancellations-log',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, NgIf, NgFor, MatIconModule],
  templateUrl: './cancellations-log.html',
})
export class CancellationsLogComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  // === STATE con signals ===
  logs = signal<CancellationLog[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filtros “form” normales (para usar [(ngModel)] sin broncas)
  filters = {
    from: '',
    to: '',
    id_user: '',
  };

  // Search como signal para que el computed solo se dispare cuando cambie
  searchTerm = signal<string>('');

  // === DERIVADOS (computed) ===
  filteredLogs = computed<CancellationLog[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const logs = this.logs();

    if (!term) return logs;

    return logs.filter((log) => {
      return (
        (log.product_name?.toLowerCase().includes(term) ?? false) ||
        (log.user_name?.toLowerCase().includes(term) ?? false) ||
        (log.table_name?.toLowerCase().includes(term) ?? false) ||
        (log.reason?.toLowerCase().includes(term) ?? false) ||
        (log.order_folio?.toLowerCase().includes(term) ?? false) ||
        String(log.id_order).includes(term)
      );
    });
  });

  totalItemsCancelled = computed<number>(() => {
    return this.logs().reduce((acc, log) => acc + (log.quantity || 0), 0);
  });

  constructor(private cancellationsService: MetricsService) {}

  ngOnInit() {
    if (!this.isBrowser) return;

    // Por defecto: últimos 7 días
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 7);

    this.filters.from = this.toInputDate(from);
    this.filters.to = this.toInputDate(today);

    this.loadLogs();
  }

  private toInputDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadLogs(): void {
    if (!this.filters.from || !this.filters.to) {
      this.error.set('Selecciona un rango de fechas.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.cancellationsService
      .getCancellations({
        from: this.filters.from,
        to: this.filters.to,
        id_user: this.filters.id_user || undefined,
      })
      .subscribe({
        next: (data) => {
          this.logs.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set('Error al cargar las cancelaciones.');
          this.loading.set(false);
        },
      });
  }

  resetFilters(): void {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 7);

    this.filters.from = this.toInputDate(from);
    this.filters.to = this.toInputDate(today);
    this.filters.id_user = '';
    this.searchTerm.set('');
    this.loadLogs();
  }

  orderTypeLabel(type: string | null | undefined): string {
    if (type === 'dine_in') return 'Comer aquí';
    if (type === 'takeout') return 'Para llevar';
    return '—';
  }

}

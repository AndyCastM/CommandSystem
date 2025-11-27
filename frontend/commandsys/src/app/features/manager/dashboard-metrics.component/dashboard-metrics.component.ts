import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { MetricsService, MetricsResponse } from '../../../core/services/metrics/metrics.service';
import { ToastService } from '../../../shared/UI/toast.service';
import { isBrowser } from '../../../core/utils/platform';

// Chart.js
import {
  Chart,
  ChartConfiguration,
  registerables
} from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-metrics',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './dashboard-metrics.component.html',
})
export class DashboardMetricsComponent implements OnInit, AfterViewInit, OnDestroy {

  private metricsApi = inject(MetricsService);
  private toast = inject(ToastService);

  loading = signal(false);
  metrics = signal<MetricsResponse | null>(null);

  from = signal<string>('');
  to = signal<string>('');

  today = this.formatDate(new Date());
  minFrom = '';
  maxTo = this.today;

  showCustom = false; // para mostrar/ocultar inputs de rango custom

  // canvas refs
  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartRef!: ElementRef<HTMLCanvasElement>;

  private salesChart?: Chart;
  private ordersChart?: Chart;

  ngOnInit() {
    if (!isBrowser()) return;

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    const fromStr = this.formatDate(start);
    const toStr = this.formatDate(today);

    this.from.set(fromStr);
    this.to.set(toStr);

    this.minFrom = '2000-01-01';
    this.maxTo = this.today;

    this.refresh();
  }

  ngAfterViewInit() {}
  ngOnDestroy() {
    this.salesChart?.destroy();
    this.ordersChart?.destroy();
  }

  // ================== FECHAS ==================
  formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Normaliza completamente la fecha evitando jumps por zona horaria
   * Convertimos el string a YYYY-MM-DDT12:00:00
   */
  private normalize(dateStr: string): Date {
    return new Date(dateStr + "T12:00:00");
  }

  // ======= BOTONES RÁPIDOS =======
  setRange(type: 'day' | 'week' | 'month') {
    this.showCustom = false;

    const today = new Date();
    const end = this.formatDate(today);

    let startDate = new Date(today);

    if (type === 'day') {
      startDate = today;
    }

    if (type === 'week') {
      startDate.setDate(today.getDate() - 6);
    }

    if (type === 'month') {
      startDate.setDate(today.getDate() - 29);
    }

    const start = this.formatDate(startDate);

    this.from.set(start);
    this.to.set(end);

    this.refresh();
  }

  toggleCustom() {
    this.showCustom = !this.showCustom;
  }

  // ======= VALIDACIÓN RANGO =======
  onDateChange(type: 'from' | 'to', value: string) {
    if (!value) return;

    const newDate = this.normalize(value);
    const fromN = this.normalize(this.from());
    const toN = this.normalize(this.to());
    const todayN = this.normalize(this.today);

    // actualizar binding
    if (type === 'from') this.from.set(value);
    if (type === 'to') this.to.set(value);

    // evitar futuro
    if (newDate > todayN) {
      this.toast.error('No puedes seleccionar fechas futuras');
      if (type === 'from') this.from.set(this.today);
      if (type === 'to') this.to.set(this.today);
      return;
    }

    // evitar fechas invertidas
    if (type === 'from' && newDate > toN) {
      this.toast.error('La fecha inicial no puede ser mayor a la final');
      this.from.set(this.to());
      return;
    }

    if (type === 'to' && newDate < fromN) {
      this.toast.error('La fecha final no puede ser menor a la inicial');
      this.to.set(this.from());
      return;
    }

    // ===== RANGO MÁXIMO CORREGIDO =====
    const msPerDay = 1000 * 60 * 60 * 24;

    // normalizar para el cálculo
    const f = this.normalize(this.from());
    const t = this.normalize(this.to());

    // RANGO INCLUSIVO
    const diffDays = Math.floor((t.getTime() - f.getTime()) / msPerDay);

    if (diffDays > 30) {
      this.toast.error(`El rango máximo permitido es de 30 días`);
      console.log('Dias seleccionados', diffDays);

      const newFrom = new Date(t);
      newFrom.setDate(t.getDate() - 29);

      this.from.set(this.formatDate(newFrom));
      return;
    }

    this.refresh();
  }

  // ================== CARGA DE DATOS ==================
  refresh() {
    if (!isBrowser()) return;

    const from = this.from();
    const to = this.to();
    if (!from || !to) return;

    this.loading.set(true);
    this.loadTopProducts();

    this.metricsApi.getDashboard(from, to).subscribe({
      next: (res) => {
        this.metrics.set(res);
        this.updateCharts();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar métricas');
        this.loading.set(false);
      },
    });
  }

  // ================== TOP PRODUCTOS ==================
  topProducts = signal<any[]>([]);

  loadTopProducts() {
    this.metricsApi.getTopProducts(this.from(), this.to()).subscribe({
      next: (res) => this.topProducts.set(res),
      error: () => this.toast.error('Error cargando ranking de productos')
    });
  }

  // ================== CHARTS ==================
  private formatChartDate(dateStr: string): string {
    const d = new Date(dateStr);
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  private updateCharts() {
    if (!isBrowser()) return;
    const data = this.metrics();
    if (!data) return;

    // ---- Ventas ----
    const salesLabels = data.sales_over_time.map(d => this.formatChartDate(d.date));
    const salesData = data.sales_over_time.map(d => Number(d.total));

    if (this.salesChart) this.salesChart.destroy();

    if (this.salesChartRef?.nativeElement) {
      const ctx = this.salesChartRef.nativeElement.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(16,185,129,0.3)');
        gradient.addColorStop(1, 'rgba(16,185,129,0.01)');

        const config: ChartConfiguration<'line'> = {
          type: 'line',
          data: {
            labels: salesLabels,
            datasets: [
              {
                label: 'Ventas',
                data: salesData,
                tension: 0.4,
                borderColor: '#10b981',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                pointRadius: 5,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 3,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
          }
        };

        this.salesChart = new Chart(ctx, config);
      }
    }

    // ---- Comandas ----
    const ordersLabels = data.orders_over_time.map(d => this.formatChartDate(d.date));
    const ordersData = data.orders_over_time.map(d => Number(d.count));

    if (this.ordersChart) this.ordersChart.destroy();

    if (this.ordersChartRef?.nativeElement) {
      const ctx2 = this.ordersChartRef.nativeElement.getContext('2d');
      if (ctx2) {
        const colors = [
          '#93c5fd','#6ee7b7','#1e293b','#60a5fa','#c4b5fd',
          '#86efac','#fbbf24','#f472b6','#a78bfa','#fb923c'
        ];

        const config2: ChartConfiguration<'bar'> = {
          type: 'bar',
          data: {
            labels: ordersLabels,
            datasets: [
              {
                label: 'Comandas',
                data: ordersData,
                backgroundColor: ordersData.map((_, i) => colors[i % colors.length]),
                borderRadius: 16,
                borderSkipped: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
          }
        };

        this.ordersChart = new Chart(ctx2, config2);
      }
    }
  }
}

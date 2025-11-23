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

  // canvas refs
  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartRef!: ElementRef<HTMLCanvasElement>;

  private salesChart?: Chart;
  private ordersChart?: Chart;

  ngOnInit() {
    if (!isBrowser()) return; // evitar SSR llamando al backend

    // por default: últimos 7 días
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    this.from.set(this.formatDate(start));
    this.to.set(this.formatDate(today));

    this.refresh();
  }

  ngAfterViewInit() {
    // los charts se crean/actualizan después de cargar métricas
    // desde refresh() se llama a updateCharts() cuando ya hay datos
  }

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

  onDateChange(which: 'from' | 'to', value: string) {
    if (which === 'from') this.from.set(value);
    else this.to.set(value);
  }

  // ================== CARGA DE DATOS ==================
  refresh() {
    if (!isBrowser()) return;

    const from = this.from();
    const to = this.to();

    if (!from || !to) return;

    this.loading.set(true);

    this.metricsApi.getDashboard(from, to).subscribe({
      next: (res) => {
        this.metrics.set(res);
        this.updateCharts();
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Error al cargar métricas');
        this.loading.set(false);
      },
    });
  }

  // ================== CHARTS ==================
  // para formatear fechas
  private formatChartDate(dateStr: string): string {
    const date = new Date(dateStr);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  }

  private updateCharts() {
    if (!isBrowser()) return;
    const data = this.metrics();
    if (!data) return;

    // ---- Ventas por día ----
    const salesLabels = data.sales_over_time.map(d => this.formatChartDate(d.date));
    const salesData = data.sales_over_time.map(d => Number(d.total));

    if (this.salesChart) {
      this.salesChart.destroy();
    }

    if (this.salesChartRef?.nativeElement) {
      const ctx = this.salesChartRef.nativeElement.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

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
                pointHoverRadius: 8,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 3,
                pointHoverBackgroundColor: '#059669',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              intersect: false,
              mode: 'index'
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                padding: 16,
                cornerRadius: 12,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                displayColors: false,
                callbacks: {
                  label: function(context) {
                    return 'Ventas: $' + context.parsed.y!.toLocaleString('es-MX');
                  }
                }
              }
            },
            scales: {
              x: {
                grid: { 
                  display: false
                },
                ticks: { 
                  font: { size: 12, weight: 500 },
                  color: '#64748b'
                },
              },
              y: {
                grid: { 
                  color: 'rgba(0, 0, 0, 0.06)',
                  //drawBorder: false
                },
                ticks: {
                  font: { size: 12 },
                  color: '#64748b',
                  callback: function(value) {
                    return '$' + (value as number).toLocaleString('es-MX');
                  },
                  padding: 8
                },
                border: { display: false }
              }
            },
          },
        };
        this.salesChart = new Chart(ctx, config);
      }
    }

    // ---- Comandas por día ----
    const ordersLabels = data.orders_over_time.map(d => this.formatChartDate(d.date));
    const ordersData = data.orders_over_time.map(d => Number(d.count));

    // Colores variados y vibrantes para cada barra
    const barColors = [
      '#93c5fd', // blue-300
      '#6ee7b7', // emerald-300
      '#1e293b', // slate-800
      '#60a5fa', // blue-400
      '#c4b5fd', // violet-300
      '#86efac', // green-300
      '#fbbf24', // amber-400
      '#f472b6', // pink-400
      '#a78bfa', // violet-400
      '#fb923c', // orange-400
    ];

    if (this.ordersChart) {
      this.ordersChart.destroy();
    }

    if (this.ordersChartRef?.nativeElement) {
      const ctx2 = this.ordersChartRef.nativeElement.getContext('2d');
      if (ctx2) {
        const config2: ChartConfiguration<'bar'> = {
          type: 'bar',
          data: {
            labels: ordersLabels,
            datasets: [
              {
                label: 'Comandas',
                data: ordersData,
                backgroundColor: ordersData.map((_, i) => barColors[i % barColors.length]),
                borderRadius: 20, //  Bordes 
                borderSkipped: false,
                barPercentage: 0.5, // anchura de la barra
                categoryPercentage: 0.8,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              intersect: false,
              mode: 'index'
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                padding: 16,
                cornerRadius: 12,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                displayColors: false,
                callbacks: {
                  label: function(context) {
                    return 'Comandas: ' + context.parsed.y;
                  }
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { 
                  font: { size: 12, weight: 500 },
                  color: '#64748b'
                },
              },
              y: {
                grid: { 
                  color: 'rgba(0, 0, 0, 0.06)',
                  //drawBorder: false
                },
                ticks: {
                  font: { size: 12 },
                  color: '#64748b',
                  stepSize: 1,
                  precision: 0,
                  padding: 8
                },
                beginAtZero: true,
                border: { display: false }
              }
            },
          },
        };
        this.ordersChart = new Chart(ctx2, config2);
      }
    }
  }
}

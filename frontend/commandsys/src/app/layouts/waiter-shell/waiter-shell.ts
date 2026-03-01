import { Component, inject, computed, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/services/auth.service';
import { CapitalizePipe } from '../../shared/pipes/capitalize.pipe';
import { TableAlert } from '../../core/services/notifications/notifications.service';
import { NotificationsService } from '../../core/services/notifications/notifications.service';
import { Subscription } from 'rxjs';
import { OrdersEventsService } from '../../core/services/orders/orders-event.service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ToastService } from '../../shared/UI/toast.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-waiter-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, MatIconModule, CapitalizePipe, CommonModule],
  templateUrl: './waiter-shell.html',
  styleUrl: './waiter-shell.css',
})
export class WaiterShellComponent implements OnInit {
  nav = [
    { icon: 'table_restaurant', label: 'Mesas', path:'/mesero/mesas'},
    { icon: 'receipt_long', label: 'Comandas', path: '/mesero/comandas' },
    { icon: 'menu_book_2', label: 'Menú', path: '/mesero/menu'},
  ];

  private sub?: Subscription;
  private notif = inject(NotificationsService);
  lastAlert?: TableAlert;
  private ordersEvents = inject(OrdersEventsService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private toast = inject(ToastService);

  async ngOnInit(){
    if (!this.isBrowser) return; // evita que socket falle en SSR
    // Socket
    this.notif.connect();

    this.sub = this.notif.onAlert().subscribe((alert) => {
      if (alert) this.lastAlert = alert;
    });

    this.sub = this.notif.onItemReady().subscribe(() => {
      this.ordersEvents.triggerRefresh(); // manda la señal global
    });

    this.sub = this.notif.onGroupReady().subscribe(() => {
      this.ordersEvents.triggerRefresh();
    })
  }

   get user() {
    return this.auth.getUserFromCookie();
  }
  // constructor() {
  //   console.log("SHELL CREADO");
  // }

  // ngOnDestroy() {
  //   console.log("SHELL DESTRUIDO");
  // }

  private auth = inject(AuthService);
  currentUser = computed(() => this.auth.currentUser());
  private router = inject(Router);

  sidebarOpen = false; // móvil
  sidebarCollapsed = false;

  toggleCollapse() { this.sidebarCollapsed = !this.sidebarCollapsed;}
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  async onLogout() {
    try {
      const sessions = await this.auth.logoutWaiter();

      if (sessions && sessions.length > 0) {
        this.toast.warning('No puedes cerrar sesión con mesas abiertas.');
        this.router.navigate(['/mesero/mesas']);
        return;
      }

      // SIN MESAS → logout real
      await this.auth.logout();
    } catch (err) {
      console.error(err);
      this.toast.error('Error verificando el estado de mesas');
    }
  }

 }

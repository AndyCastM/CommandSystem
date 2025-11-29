import { Component, inject, computed, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/services/auth.service';
import { CapitalizePipe } from '../../shared/pipes/capitalize.pipe';
import { TableAlert } from '../../core/services/notifications/notifications.service';
import { NotificationsService } from '../../core/services/notifications/notifications.service';
import { Subscription } from 'rxjs';
import { OrdersEventsService } from '../../core/services/orders/orders-event.service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-waiter-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, MatIconModule, CapitalizePipe],
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

  }

  // constructor() {
  //   console.log("SHELL CREADO");
  // }

  // ngOnDestroy() {
  //   console.log("SHELL DESTRUIDO");
  // }

  private auth = inject(AuthService);
  currentUser = computed(() => this.auth.currentUser());

  sidebarOpen = false; // móvil
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  onLogout() {
    this.auth.logout()    
  }
 }

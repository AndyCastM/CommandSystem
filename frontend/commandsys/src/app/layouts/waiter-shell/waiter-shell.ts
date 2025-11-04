import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/services/auth.service';
import { CapitalizePipe } from '../../shared/pipes/capitalize.pipe';

@Component({
  selector: 'app-waiter-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, MatIconModule, CapitalizePipe],
  templateUrl: './waiter-shell.html',
  styleUrl: './waiter-shell.css',
})
export class WaiterShellComponent {
  nav = [
    { icon: 'table_restaurant', label: 'Mesas', path:'/mesero/mesas'},
    { icon: 'receipt_long', label: 'Comandas', path: '/mesero/comandas' },
  ];


  private auth = inject(AuthService);
  currentUser = computed(() => this.auth.currentUser());

  sidebarOpen = false; // móvil
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  onLogout() {
    this.auth.logout()    
  }
 }

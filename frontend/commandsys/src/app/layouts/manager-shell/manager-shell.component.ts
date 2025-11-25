import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/services/auth.service';
import { CapitalizePipe } from '../../shared/pipes/capitalize.pipe';

@Component({
  selector: 'app-manager-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, MatIconModule, CapitalizePipe],
  templateUrl: './manager-shell.component.html',
  styleUrl: './manager-shell.component.css',
})
export class ManagerShellComponent {
  nav = [
    { icon: 'dashboard', label: 'Dashboard', path: '/gerente/dashboard' },
    { icon: 'people', label: 'Usuarios', path: '/gerente/usuarios' },
    { icon: 'inventory_2', label: 'Productos', path: '/gerente/productos' },
    { icon: 'table_restaurant', label: 'Mesas', path:'/gerente/mesas'},
    { icon: 'print', label: 'Impresora', path: '/gerente/impresora'},
    { icon: 'settings', label: 'Configuración', path: '/gerente/configuracion' },
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

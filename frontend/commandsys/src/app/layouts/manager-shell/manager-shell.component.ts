import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manager-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, MatIconModule],
  templateUrl: './manager-shell.component.html',
  styleUrl: './manager-shell.component.css',
})
export class ManagerShellComponent {
  nav = [
    { icon: 'people', label: 'Usuarios', path: '/gerente/usuarios' },
    { icon: 'inventory_2', label: 'Productos', path: '/gerente/productos' },
    { icon: 'settings', label: 'Configuración', path: '/gerente/configuracion' },
  ];

  sidebarOpen = false; // móvil
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  onLogout() {
    // TODOOO
    // aquí invocarías AuthService.logout() y redirigir a login
    console.log('logout');
  }
 }

import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css',
})
export class AdminShellComponent {
  nav = [
    { icon: '📦', label: 'Productos', path: '/admin/productos', disabled: true }, // demo
    { icon: '🏢', label: 'Sucursales', path: '/admin/sucursales' },
    { icon: '⚙️', label: 'Configuración', path: '/admin/configuracion' },
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

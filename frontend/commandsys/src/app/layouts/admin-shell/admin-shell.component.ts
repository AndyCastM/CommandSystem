import { Component , inject} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, MatIconModule],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css'],
})
export class AdminShellComponent {
  nav = [
    { icon: 'people', label: 'Usuarios', path: '/admin/usuarios' },
    { icon: 'inventory_2', label: 'Productos', path: '/admin/productos' },
    { icon: 'apartment', label: 'Sucursales', path: '/admin/sucursales' },
    { icon: 'settings', label: 'Configuración', path: '/admin/configuracion' },
  ];

  private auth = inject(AuthService);
  sidebarOpen = false; // móvil
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  onLogout() {
    this.auth.logout()    
  }
}

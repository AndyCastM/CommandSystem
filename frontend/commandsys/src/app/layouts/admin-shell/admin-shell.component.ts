import { Component , inject, computed} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/services/auth.service';
import { CapitalizePipe } from '../../shared/pipes/capitalize.pipe';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, MatIconModule, CapitalizePipe],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css'],
})
export class AdminShellComponent {
  nav = [
    { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: 'people', label: 'Usuarios', path: '/admin/usuarios' },
    { icon: 'inventory_2', label: 'Productos', path: '/admin/productos' },
    //{ icon: 'food_bank', label: 'Combos', path: '/admin/combos' },
    { icon: 'face_2', label: 'Generador IA', path: '/admin/generador-ia'},
    { icon: 'apartment', label: 'Sucursales', path: '/admin/sucursales' },
    { icon: 'settings', label: 'Configuración', path: '/admin/configuracion' },
  ];

  currentUser = computed(() => this.auth.currentUser());

  private auth = inject(AuthService);
  sidebarOpen = false; // móvil
  sidebarCollapsed = false;
  
  toggleCollapse() { this.sidebarCollapsed = !this.sidebarCollapsed;}
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  onLogout() {
    this.auth.logout()    
  }
}

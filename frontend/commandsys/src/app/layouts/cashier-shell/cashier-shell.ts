import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/services/auth.service';
import { CapitalizePipe } from '../../shared/pipes/capitalize.pipe';
import { CashService } from '../../core/services/cash/cash.service';
import { ToastService } from '../../shared/UI/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cashier-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, MatIconModule, CapitalizePipe],
  templateUrl: './cashier-shell.html',
  styleUrl: './cashier-shell.css',
})
export class CashierShell { 
  nav = [
    { icon: 'paid', label: 'Caja', path: '/cajero/caja' },
  ];

  currentUser = computed(() => this.auth.currentUser());

  private auth = inject(AuthService);
  private cash = inject(CashService);
  private toast = inject(ToastService);
  private router = inject(Router);
  
  sidebarOpen = false; // móvil
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  async onLogout() {
    try {
      const active = await this.cash.getActiveSession();

      if (active && !active.is_closed) {
        this.toast.warning(
          'No puedes cerrar sesión con una caja abierta. Realiza primero el cierre de caja.'
        );

        // enviar a la vista de caja
        this.router.navigate(['/cajero/caja']);
        return;
      }

      // Si no hay caja abierta → logout normal
      this.auth.logout();
    } catch (err) {
      console.error(err);
      this.toast.error('Error verificando el estado de caja');
    }
  }

}

import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Superadmin } from '../../data-access/superadmin';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-users-support-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './users-support-modal.html',
})
export class UsersSupportModalComponent {
  @Input() company!: any;
  @Input() close!: () => void;

  users = signal<any[]>([]);
  loading = signal(false);

  constructor(private srv: Superadmin, private sb: MatSnackBar) {
    this.loadUsers();
  }

  async loadUsers() {
    try {
      this.loading.set(true);
      //const data = await this.srv.getCompanyUsers(this.company.id_company);
      //this.users.set(data);
    } catch (err) {
      console.error(err);
      this.sb.open('Error al cargar usuarios', 'OK', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  async resetPassword(u: any) {
    try {
      //await this.srv.resetUserPassword(u.id_user);
      this.sb.open(`Contraseña restablecida para ${u.username}`, 'OK', { duration: 3000 });
    } catch {
      this.sb.open('Error al restablecer contraseña', 'OK', { duration: 3000 });
    }
  }

  async toggleActive(u: any) {
    try {
      //await this.srv.toggleUserActive(u.id_user);
      this.sb.open(`Usuario ${u.is_active ? 'desactivado' : 'activado'}`, 'OK', { duration: 3000 });
      this.loadUsers();
    } catch {
      this.sb.open('Error al cambiar estado del usuario', 'OK', { duration: 3000 });
    }
  }
}

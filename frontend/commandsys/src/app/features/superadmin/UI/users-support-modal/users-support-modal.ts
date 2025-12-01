import { Component, Input, signal, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UsersService } from '../../../../core/services/users/users.service';
import { ToastService } from '../../../../shared/UI/toast.service';
import { firstValueFrom } from 'rxjs';
import { Superadmin } from '../../data-access/superadmin';
import { ResetPasswordModalComponent } from '../reset-password-modal/reset-password-modal.component';

@Component({
  selector: 'app-users-support-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, ResetPasswordModalComponent],
  templateUrl: './users-support-modal.html',
})
export class UsersSupportModalComponent implements OnChanges {
  @Input() company!: any;
  @Input() close!: () => void;

  private userSrv = inject(UsersService);
  private toast = inject(ToastService);
  private superadmin = inject(Superadmin);

  users = signal<any[]>([]);
  loading = signal(false);

  showResetModal = signal(false);
  selectedUser = signal<any>(null);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['company']?.currentValue) {
      //console.log('Company recibida:', this.company);
      this.loadUsers();
    }
  }

  async loadUsers() {
    try {
      this.loading.set(true);
      const res: any = await firstValueFrom(
        this.userSrv.getUsersByCompany(this.company.id_company)
      );
      //console.log('Respuesta del backend:', res);
      this.users.set(res?.data || []);
    } catch (err) {
      console.error(err);
      this.toast.error('Error al cargar usuarios');
    } finally {
      this.loading.set(false);
    }
  }

  async resetPassword(u: any) {
    this.selectedUser.set(u);
    this.showResetModal.set(true);
  }

  async handleResetPassword(newPassword: string) {
    try {
      await this.superadmin.resetPassword(this.selectedUser().id_user, newPassword);
      this.toast.success(`Contraseña restablecida para ${this.selectedUser().username}`);
      this.showResetModal.set(false);
    } catch (err) {
      console.error(err);
      this.toast.error('Error al restablecer contraseña');
      throw err; // Re-lanzar para que el modal maneje el loading
    }
  }

  closeResetModal() {
    this.showResetModal.set(false);
  }
  async toggleActive(u: any) {
    try {
      if (u.is_active){
        // Desactivar usuario
        await this.superadmin.deactivateUser(u.id_user);
      } else {
        // Activar usuario
        await this.superadmin.activateUser(u.id_user);
      }
      this.toast.success(`Usuario ${u.is_active ? 'desactivado' : 'activado'}`);
      this.loadUsers();
    } catch {
      this.toast.error('Error al cambiar estado del usuario');
    }
  }
}

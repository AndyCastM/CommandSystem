import { Component, Input, signal, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UsersService } from '../../../../core/services/users/users.service';
import { ToastService } from '../../../../shared/UI/toast.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-users-support-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './users-support-modal.html',
})
export class UsersSupportModalComponent implements OnChanges {
  @Input() company!: any;
  @Input() close!: () => void;

  private userSrv = inject(UsersService);
  private toast = inject(ToastService);

  users = signal<any[]>([]);
  loading = signal(false);

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
    try {
      this.toast.success(`Contraseña restablecida para ${u.username}`);
    } catch {
      this.toast.error('Error al restablecer contraseña');
    }
  }

  async toggleActive(u: any) {
    try {
      this.toast.success(`Usuario ${u.is_active ? 'desactivado' : 'activado'}`);
      this.loadUsers();
    } catch {
      this.toast.error('Error al cambiar estado del usuario');
    }
  }
}

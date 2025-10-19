import { Component, OnInit, computed, signal, inject , effect} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UsersService } from '../data-access/users.service';
import { User } from '../data-access/user.model';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { UserFormComponent, UserDialogData } from '../UI/user-form.component';
import { AuthService } from '../../../../auth/services/auth.service';
import { Role } from '../../../../auth/services/auth.service';
import { CreateUser } from '../data-access/user.model';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../../shared/UI/toast.service';
import {  NgFor } from '@angular/common';
@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule,],
  templateUrl: './users-page.html'
})
export class UsersPageComponent {
  private dialog = inject(MatDialog);
  private auth = inject(AuthService);
  private usersService = inject(UsersService);
  private toast = inject(ToastService);

  currentUser = computed(() => this.auth.currentUser());
  private role = computed<Role | null>(() => {
    const user = this.currentUser();
    if (!user) return null;
    return (user as any)?.role_name ?? (user as any)?.user?.role_name ?? null;
  });

  users = computed<User[]>(() => this.usersService.users());
  search = signal('');
  loading = signal(true);
  
  togglingIds = new Set<number>();

  constructor() {
    effect( async () => {
      const user = this.currentUser();
      if (user) {
        console.log('Usuario actual detectado:', user);
        await this.usersService.load();
        this.loading.set(this.usersService.loading());
      }
    });
  }

  async openCreate() {
    const data: UserDialogData = { mode: 'create' };
    const ref = this.dialog.open(UserFormComponent, {
      data,
      width: '720px',
      autoFocus: false
    });
  }

  async openEditUser(user: any) {
    const ref = this.dialog.open(UserFormComponent, {
      width: '720px',
      data: { mode: 'edit', value: user } as const,
    });

    const value = await firstValueFrom(ref.afterClosed());
    if (!value) return;

    try {
      await this.usersService.updateUser(user.id_user, value);
      this.toast.success('Usuario actualizado');
    } catch (e){
      this.toast.error('No se pudo actualizar el usuario');
      console.error(e);
    }
  }

  toggleUserActive(u: User) {
    // Evitar clicks múltiples
    if (this.togglingIds.has(u.id_user)) return;
    this.togglingIds.add(u.id_user);

    const wasActive = u.is_active;
    const next = !wasActive;
    u.is_active = next; // cambio optimista inmediato

    const obs = wasActive
      ? this.usersService.deleteUser(u.id_user)   // desactivar
      : this.usersService.activeUser(u.id_user);  // activar

    obs.subscribe({
      next: () => {
        this.togglingIds.delete(u.id_user);
      },
      error: () => {
        // Revertir si hubo error
        u.is_active = wasActive;
        this.togglingIds.delete(u.id_user);
      }
    });
  }

}

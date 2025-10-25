import { Component, computed, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { UsersService } from '../../../../core/services/users/users.service';
import { User } from '../../../../core/services/users/user.model';
import { UserFormComponent, UserDialogData } from '../UI/user-form.component';
import { AuthService } from '../../../../auth/services/auth.service';
import { ToastService } from '../../../../shared/UI/toast.service';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule],
  templateUrl: './users-page.component.html',
})
export class UsersPageComponent {
  private dialog = inject(MatDialog);
  private auth = inject(AuthService);
  private usersService = inject(UsersService);
  private toast = inject(ToastService);

  currentUser = computed(() => this.auth.currentUser());
  users = computed<User[]>(() => this.usersService.users());
  total = computed(() => this.users().length);
  actives = computed(() => this.users().filter(u => u.is_active).length);
  inactives = computed(() => this.total() - this.actives());

  search = signal('');
  loading = signal(true);
  togglingIds = new Set<number>();

  constructor() {
    effect(async () => {
      const user = this.currentUser();
      if (user) {
        await this.usersService.load();
        this.loading.set(this.usersService.loading());
      }
    });
  }

  // === Filtro === //
  filteredUsers = computed(() => {
    const term = this.search().toLowerCase().trim();
    return this.users().filter(u =>
      [u.name, u.last_name, u.role_name, u.username]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  });

  // === Crear usuario === //
  async openCreate() {
    const data: UserDialogData = {
      mode: 'create',
      currentUser: this.currentUser(),
    };

    const ref = this.dialog.open(UserFormComponent, {
      data,
      width: '720px',
      autoFocus: false,
    });

    const created = await firstValueFrom(ref.afterClosed());
    if (!created) return;

    // Actualiza la signal local sin recargar
    this.usersService.users.update(list => [created, ...list]);
    this.toast.success('Usuario creado correctamente');
  }

  // === Editar usuario === //
  async openEditUser(user: User) {
    const ref = this.dialog.open(UserFormComponent, {
      width: '720px',
      data: {
        mode: 'edit',
        value: user,
        currentUser: this.currentUser(),
      } as const,
    });

    const updated = await firstValueFrom(ref.afterClosed());
    if (!updated) return;

    this.usersService.users.update(list =>
      list.map(u =>
        u.id_user === updated.id_user ? { ...u, ...updated } : u
      )
    );
    this.toast.success('Usuario actualizado correctamente');
  }

  // === Activar / Desactivar usuario === //
  toggleUserActive(u: User) {
    if (this.togglingIds.has(u.id_user)) return;
    this.togglingIds.add(u.id_user);

    const wasActive = u.is_active;
    const next = !wasActive;
    u.is_active = next; // cambio optimista

    const obs = wasActive
      ? this.usersService.deleteUser(u.id_user)   // desactivar
      : this.usersService.activeUser(u.id_user);  // activar

    obs.subscribe({
      next: () => {
        this.togglingIds.delete(u.id_user);
        this.toast.success(`Usuario ${next ? 'activado' : 'desactivado'} correctamente`);
      },
      error: () => {
        u.is_active = wasActive; // revertir
        this.togglingIds.delete(u.id_user);
        this.toast.error('Error al cambiar estado');
      },
    });
  }
}

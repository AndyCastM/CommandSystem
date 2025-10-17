import { Component, OnInit, computed, signal, inject , effect} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UsersService } from '../data-access/users.service';
import { User } from '../data-access/user.model';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { UserFormComponent } from '../UI/user-form.component';
import { AuthService } from '../../../../auth/services/auth.service';
import { Role } from '../../../../auth/services/auth.service';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule],
  templateUrl: './users-page.html'
})
export class UsersPageComponent {
  private dialog = inject(MatDialog);
  private auth = inject(AuthService);
  private usersService = inject(UsersService);
  currentUser = computed(() => this.auth.currentUser());
  private role = computed<Role | null>(() => {
    const user = this.currentUser();
    if (!user) return null;
    return (user as any)?.role_name ?? (user as any)?.user?.role_name ?? null;
  });

  users = computed<User[]>(() => this.usersService.users());
  search = signal('');
  loading = signal(true);
  
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
    const ref = this.dialog.open(UserFormComponent, {
      width: '720px',
      autoFocus: false
    });
  }

  editUser(u: User) {
    console.log('Editar usuario', u);
    // TODO: abrir modal con datos cargados
  }

  deleteUser(u: User) {
    if (confirm(`¿Eliminar usuario ${u.name}?`)) {
      
    }
  }
}

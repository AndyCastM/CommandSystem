import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UsersService } from '../data-access/users.service';
import { CreateUser } from '../data-access/user.model';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { UserFormComponent } from '../UI/user-form.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule],
  templateUrl: './users-page.html'
})
export class UsersPageComponent implements OnInit {
  private dialog = inject(MatDialog);

  users = signal<CreateUser[]>([]);
  search = signal('');
  loading = signal(true);

  currentUser = {
    role: 'admin', // Cambiar a 'gerente' según el usuario logueado
    id_company: 1,
    id_branch: 10
  };

  constructor(private usersService: UsersService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    const params =
      this.currentUser.role === 'admin'
        ? { company: this.currentUser.id_company }
        : { branch: this.currentUser.id_branch };

    this.usersService.getUsers(params).subscribe({
      next: (res) => {
        this.users.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filtered = computed(() => {
    const s = this.search().toLowerCase();
    return this.users().filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        u.username.toLowerCase().includes(s)
    );
  });

  async openCreate() {
    const ref = this.dialog.open(UserFormComponent, {
      width: '720px',
      autoFocus: false
    });
  }

  editUser(u: CreateUser) {
    console.log('Editar usuario', u);
    // TODO: abrir modal con datos cargados
  }

  deleteUser(u: CreateUser) {
    if (confirm(`¿Eliminar usuario ${u.name}?`)) {
      this.usersService.deleteUser(u.id_role).subscribe(() => this.loadUsers());
    }
  }
}

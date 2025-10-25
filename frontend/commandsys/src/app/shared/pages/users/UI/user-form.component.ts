import { Component, Input, Inject, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { CreateUser, User } from '../../../../core/services/users/user.model';
import { UsersService } from '../../../../core/services/users/users.service';
import { RolesService } from '../../../../core/services/roles.service';
import { BranchesApi } from '../../../../core/services/branches/branches.api';
import { ToastService } from '../../../UI/toast.service';

export type UserDialogMode = 'create' | 'edit';
export type UserDialogData = {
  mode: UserDialogMode;
  value?: User;
  currentUser?: any;
};

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatDialogModule, MatSelectModule],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent {
  // === Signals ===
  editing = signal(false);
  branches = signal<any[]>([]);
  roles = signal<any[]>([]);
  saving = signal(false);

  @Input() editingUser?: CreateUser;

  private fb = inject(FormBuilder);
  private rolesSrv = inject(RolesService);
  private branchesSrv = inject(BranchesApi);
  private usersService = inject(UsersService);
  private toast = inject(ToastService);

  form: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData,
    private ref: MatDialogRef<UserFormComponent>
  ) {
    this.editing.set(data?.mode === 'edit');

    this.form = this.fb.group({
      id_branch: [null],
      id_role: [null, Validators.required],
      name: ['', Validators.required],
      last_name: ['', Validators.required],
      last_name2: [''],
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  // === UI Computeds ===
  title = computed(() =>
    this.editing() ? 'Editar Usuario' : 'Nuevo Usuario'
  );
  subtitle = computed(() =>
    this.editing()
      ? 'Modifica los datos del usuario.'
      : 'Completa los datos del usuario para registrarlo en el sistema.'
  );

  ngOnInit() {
    const currentUser = this.data?.currentUser;

    this.loadRoles(currentUser);

    // Solo carga sucursales si no es Gerente
    if (this.shouldShowBranch(currentUser)) {
      this.loadBranches();
    }

    // Si está editando, rellena el form
    if (this.editing() && this.data?.value) {
      const user = this.data.value;
      this.form.patchValue({
        id_branch: user.id_branch ?? null,
        id_role: user.id_role ?? null,
        name: user.name ?? '',
        last_name: user.last_name ?? '',
        last_name2: user.last_name2 ?? '',
        username: user.username ?? '',
        password: '', // vacío al editar
      });
    }
  }

  // === Carga de Roles según el tipo de usuario ===
  loadRoles(currentUser: any) {
    this.rolesSrv.getRoles().subscribe((roles) => {
      let filtered = roles;

      switch (currentUser?.role) {
        case 'Superadmin':
          filtered = roles.filter((r) => r.name === 'Admin');
          break;
        case 'Admin':
          filtered = roles.filter((r) => r.name === 'Gerente');
          break;
        case 'Gerente':
          filtered = roles.filter((r) =>
            ['Mesero', 'Cajero'].includes(r.name)
          );
          break;
      }

      this.roles.set(filtered);
    });
  }

  // === Carga de Sucursales ===
  async loadBranches() {
    try {
      const branches = await this.branchesSrv.getAll();
      this.branches.set(branches);
    } catch (err) {
      console.error('Error al cargar sucursales:', err);
    }
  }

  // === Lógica condicional para mostrar campo de sucursal ===
  shouldShowBranch(currentUser: any): boolean {
    // Los gerentes solo pueden crear usuarios dentro de su propia sucursal
    return currentUser?.role !== 'Gerente';
  }

  isEditingLocked(): boolean {
    // Bloquea si el modal está en modo edición y el usuario actual es Gerente
    return this.editing() && this.data?.currentUser?.role === 'Gerente';
  }

  // === Acciones ===
  close() {
    this.ref.close();
  }

  submit() {
    if (this.form.invalid) return;

    this.saving.set(true);
    const data: CreateUser = this.form.value as CreateUser;

    this.usersService.createUser(data).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Usuario creado exitosamente');
        this.close();
      },
      error: (err) => {
        this.saving.set(false);
        console.error(err);
        this.toast.error('Error al crear usuario');
      },
    });
  }
}

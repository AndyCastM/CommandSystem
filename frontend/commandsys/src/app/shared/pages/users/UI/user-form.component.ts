import { Component, Input, Inject, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
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

      // Validación: no vacíos, no puro espacio y evitar símbolos raros
      name: ['', [Validators.required, this.noOnlySpaces]],
      last_name: ['', [Validators.required, this.noOnlySpaces]],
      last_name2: [''],

      username: ['', [
        Validators.required,
        this.noOnlySpaces,
        Validators.pattern(/^[a-zA-Z0-9._-]{3,20}$/)
      ]],

      // password requerida solo en create
      password: ['', [Validators.minLength(6)]],
    });
  }

  // ===== Validación personalizada =====
  noOnlySpaces(control: AbstractControl): ValidationErrors | null {
    const val = (control.value ?? '').trim();
    return val.length ? null : { onlySpaces: true };
  }

  // ===== UI =====
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

    if (this.shouldShowBranch(currentUser)) {
      this.loadBranches();
    }

    // ===== Edición =====
    if (this.editing() && this.data?.value) {
      const user = this.usersService.users().find(u => u.id_user === this.data.value!.id_user)
                 || this.data.value;

      this.form.patchValue({
        id_branch: user.id_branch,
        id_role: user.id_role,
        name: user.name ?? '',
        last_name: user.last_name ?? '',
        last_name2: user.last_name2 ?? '',
        username: user.username ?? '',
        password: '',
      });

      // password no obligatoria en edición
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  // ===== Roles =====
  loadRoles(currentUser: any) {
    this.rolesSrv.getRoles().subscribe((roles) => {
      let filtered = roles;

      switch (currentUser?.role) {
        case 'Superadmin':
          filtered = roles.filter(r => r.name === 'Admin');
          break;
        case 'Admin':
          filtered = roles.filter(r => r.name === 'Gerente');
          break;
        case 'Gerente':
          filtered = roles.filter(r =>
            ['Mesero', 'Cajero'].includes(r.name)
          );
          break;
      }

      this.roles.set(filtered);
    });
  }

  // ===== Sucursales =====
  async loadBranches() {
    try {
      const branches = await this.branchesSrv.getAll();
      this.branches.set(branches);
    } catch (err) {
      console.error('Error al cargar sucursales:', err);
    }
  }

  shouldShowBranch(currentUser: any): boolean {
    return currentUser?.role !== 'Gerente';
  }

  isEditingLocked(): boolean {
    return this.editing() && this.data?.currentUser?.role === 'Gerente';
  }

  // ===== Botón cerrar =====
  close() {
    this.ref.close();
  }

  // ===== Submit =====
  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos marcados.');
      return;
    }

    // Validación adicional: si se usa sucursal, debe escoger una
    if (this.shouldShowBranch(this.data?.currentUser) && !this.form.value.id_branch) {
      this.toast.error('Selecciona una sucursal.');
      return;
    }

    // Crear payload limpio
    const data: CreateUser = { ...this.form.value };

    this.saving.set(true);

    try {
      if (this.editing()) {
        const id = this.data?.value?.id_user;
        if (!id) {
          this.toast.error('No se encontró el ID del usuario');
          return;
        }

        if (!data.password) delete (data as any).password;

        const updated = await this.usersService.updateUser(id, data);
        this.ref.close(updated);

      } else {
        const created = await this.usersService.createUser(data);
        this.ref.close(created);
      }
    } catch (err: any) {
      console.error(err);
      this.toast.error(err?.error?.message || 'Error al guardar el usuario');
    } finally {
      this.saving.set(false);
    }
  }
}

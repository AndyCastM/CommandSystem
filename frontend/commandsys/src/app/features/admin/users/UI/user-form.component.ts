import { Component, Input , inject, signal, Inject, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { CreateUser } from '../data-access/user.model';
import { UsersService } from '../data-access/users.service';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { RolesService } from '../../../../core/services/roles.service';
import { BranchesApi } from '../../branches/data-access/branches.api';

export type UserDialogMode = 'create' | 'edit';
export type UserDialogData = { mode: UserDialogMode; value?: CreateUser };

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatDialogModule, MatSelectModule],
  templateUrl: './user-form.component.html'
})
export class UserFormComponent {

  // === Signals ===
  editing = signal<boolean>(false);
  branches = signal<any[]>([]);
  roles = signal<any[]>([]);
  saving = signal(false);

  @Input() editingUser?: CreateUser;
  private fb = inject(FormBuilder);
  private rolesSrv = inject(RolesService);
  private branchesSrv = inject(BranchesApi);

  form = this.fb.group({
    id_branch: [null],
    id_role: [null, Validators.required],
    name: ['', Validators.required],
    last_name: ['', Validators.required],
    last_name2: [''],
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private usersService: UsersService,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData,
    private ref: MatDialogRef<UserFormComponent>
  ) {
    this.editing.set(data?.mode === 'edit');
  }

  // --- Getters --- //
  title = computed(() => (this.editing() ? 'Editar Usuario' : 'Nuevo Usuario'));
  subtitle = computed(() => (this.editing() ? 'Modifica los datos del usuario' : 'Completa los datos del usuario para registrarlo en el sistema.'));

  ngOnInit() {
    this.loadRoles();
    this.loadBranches();
  }

  // === Carga desde el backend usando Signals ===
  loadRoles() {
    this.rolesSrv.getRoles().subscribe(roles => {
      this.roles.set(roles);
    });
  }

  loadBranches() {
    // Cargar sucursales
    this.branchesSrv.getAll().then(branches => {
      this.branches.set(branches);
    });
  }

  showBranch() {
    return true;
  }

  close() { this.ref.close(); }


  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const data: CreateUser = this.form.value as unknown as CreateUser;

    this.usersService.createUser(data).subscribe({
      next: () => {
        this.saving.set(false);
        alert('Usuario creado exitosamente');
        this.close();
      },
      error: err => {
        this.saving.set(false);
        console.error(err);
        alert('Error al crear usuario');
      }
    });
  }
}

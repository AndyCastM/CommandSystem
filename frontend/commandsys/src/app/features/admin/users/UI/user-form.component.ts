import { Component, Input , inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { CreateUser } from '../data-access/user.model';
import { UsersService } from '../data-access/users.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './user-form.component.html'
})
export class UserFormComponent {
  @Input() editingUser?: CreateUser;
  private fb = inject(FormBuilder);

  saving = false;

  form = this.fb.group({
    id_branch: [null],
    id_role: [null, Validators.required],
    name: ['', Validators.required],
    last_name: ['', Validators.required],
    last_name2: [''],
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(private usersService: UsersService) {}

  // Simulaciones de listas (puedes conectar con tus APIs)
  companies = () => [{ id_company: 1, name: 'Wyndham Garden' }];
  branches = () => [{ id_branch: 10, name: 'Los Mochis' }];
  roles = () => [
    { id_role: 1, name: 'Gerente' }, 
  ];


  showBranch() {
    return true;
  }

  editing() {
    return !!this.editingUser;
  }

  close() {
    window.history.back(); // o cerrar modal/dialog
  }

  submit() {
    if (this.form.invalid) return;
    this.saving = true;
    const data: CreateUser = this.form.value as unknown as CreateUser;

    this.usersService.createUser(data).subscribe({
      next: () => {
        this.saving = false;
        alert('Usuario creado exitosamente');
        this.close();
      },
      error: err => {
        this.saving = false;
        console.error(err);
        alert('Error al crear usuario');
      }
    });
  }
}

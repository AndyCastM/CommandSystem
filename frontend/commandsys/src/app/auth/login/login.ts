import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginResponse } from '../services/auth.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  logoSrc = '/assets/logo.png';
  illustrationSrc = '/assets/login-ilustration.png';

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  form = this.fb.group({
    usuario: ['', [Validators.required]],
    contrasena: ['', [Validators.required, Validators.minLength(4)]],
  });

  onLogoError() { this.logoSrc = '/assets/fallback-logo.png'; }
  onIllusError() { this.illustrationSrc = '/assets/fallback-illus.png'; }

  async onSubmit() {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const { usuario, contrasena } = this.form.getRawValue();

    try {
      const res = await this.auth.login(usuario!, contrasena!).toPromise();
      this.redirectByRole(res!);
    } catch (e: any) {
      this.errorMsg.set(e?.error?.message ?? 'Usuario o contraseña incorrectos');
    } finally {
      this.loading.set(false);
    }
  }

  private redirectByRole(res: LoginResponse) {
    // Guarda
    const role = res.user.role;               // 'Admin' | 'Gerente' | 'Cajero' | 'Mesero' | Superadmin'
    const id_branch = res.user.id_branch;     
    // Ejemplos de destinos
    if (role === 'Admin') {
      this.router.navigate(['/admin/configuracion']); // Panel admin
    } else if (role === 'Gerente'){
      this.router.navigate(['/gerente/usuarios']); // Panel Gerente
    } else if (role === 'Superadmin'){
      this.router.navigate(['/superadmin/dashboard']); // Panel Superadmin
    }
  }
}
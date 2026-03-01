import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginResponse } from '../services/auth.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/UI/toast.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  logoSrc = '/assets/logo.png';
  illustrationSrc = '/assets/login-ilustration.png';

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  showPassword = false;

  form = this.fb.group({
    usuario: ['', [Validators.required]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
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
      this.toast.error(e?.error?.message ?? 'Usuario o contraseña incorrectos');
      console.error('Error en login:', e);
    } finally {
      this.loading.set(false);
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private redirectByRole(res: LoginResponse) {
    // Guarda
    const role = res.user.role;               // 'Admin' | 'Gerente' | 'Cajero' | 'Mesero' | Superadmin'
    const id_branch = res.user.id_branch;     
    // Ejemplos de destinos
    if (role === 'Admin') {
      this.router.navigate(['/admin/dashboard']); // Panel admin
    } else if (role === 'Gerente'){
      this.router.navigate(['/gerente/dashboard']); // Panel Gerente
    } else if (role === 'Superadmin'){
      this.router.navigate(['/superadmin/dashboard']); // Panel Superadmin
    } else if (role === 'Mesero'){
      this.router.navigate(['/mesero/mesas']);  // Panel mesero
    } else if (role === 'Cajero'){
      this.router.navigate(['/cajero/caja']);    // Panel cajero
    } else if (role === 'Cocina'){
      this.router.navigate(['/cocina']); //Panel cocina
    }
  }
}
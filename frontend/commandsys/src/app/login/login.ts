import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
})
export class Login {
  logoSrc = 'assets/logo.png';
  illustrationSrc = 'assets/login-ilustration.png';

  form;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      usuario: ['', Validators.required],
      contrasena: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
      // TODO: autenticar
    }
  }

  // Fallback por si el asset no existe aún
  onLogoError(e: Event) { (e.target as HTMLImageElement).src = 'assets/logo-commandsystem.png'; }
  onIllusError(e: Event) { (e.target as HTMLImageElement).style.opacity = '0'; }  // opcional
}

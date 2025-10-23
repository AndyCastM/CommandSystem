// src/app/features/auth/services/auth.service.ts
import { CookieService } from 'ngx-cookie-service';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient , HttpContext} from '@angular/common/http';
import { tap, catchError, map, of } from 'rxjs';
import { SKIP_AUTH_REDIRECT } from '../../core/interceptors/auth-error.interceptor';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../shared/UI/toast.service';
export type Role = 'Admin' | 'Gerente' | 'Cajero' | 'Mesero' | 'Superadmin';

export interface LoginResponse {
  access_token: string; 
  user: {
    id_user: number;
    username: string;
    role: Role;
    id_company?: number;
    id_branch?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private cookies = inject(CookieService);
  private toast = inject(ToastService);
  // store only the user object (that's what we persist in the cookie and set on login)
  currentUser = signal<LoginResponse['user'] | null>(null);

  apiUrl = 'http://localhost:3000/api'; 

  constructor() {
    console.log('Cookies disponibles:', this.cookies.getAll());
    const saved = readUserCookie(this.cookies);
    if (saved) {
      console.log('Usuario cargado desde cookie:', saved);
      this.currentUser.set(saved);
    } else {
      console.log('No se encontró usuario en cookie');
    }
  }


  login(username: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(tap((res) => {
        // si quieres persistir usuario (no sensible), puedes guardarlo en otra cookie:
        this.cookies.set('user', JSON.stringify(res.user), { path: '/', sameSite: 'Lax' });
        this.currentUser.set(res.user);
      }));
  }

  async logout() {
  try {
    // Llama al backend para limpiar la cookie HttpOnly
    await firstValueFrom(this.http.post(`${this.apiUrl}/auth/logout`, {}));

    // Limpia valores locales (no HttpOnly)
    this.cookies.delete('user', '/');
    this.currentUser.set(null);

    this.toast.success('Sesión cerrada correctamente');
  } catch (err) {
    this.toast.error('Error al cerrar sesión');
    console.error(err);
  }
}

  get token(): string | null {
    const t = this.cookies.get('access_token');
    return t || null;
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  ensureSession$() {
    if (this.currentUser()) return of(this.currentUser());
    return this.http.get('/api/auth/me', { withCredentials: true }).pipe(
      tap(u => this.currentUser.set(u as any)),
      catchError(() => of(null))
    );
  }

  isLoggedIn$() { return this.ensureSession$().pipe(map(Boolean)); }

}


// helper para leer el usuario al arrancar
function readUserCookie(cookies: CookieService): LoginResponse['user'] | null {
  try {
    const raw = cookies.get('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

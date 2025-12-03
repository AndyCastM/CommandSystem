import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, of, tap, catchError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../shared/UI/toast.service';
import { SafeCookieService } from '../../core/utils/ssr-cookie';
import { isBrowser } from '../../core/utils/platform';
import { API_URL } from '../../core/services/constants';

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
  private cookies = inject(SafeCookieService);
  private toast = inject(ToastService);

  currentUser = signal<LoginResponse['user'] | null>(null);

  apiUrl = API_URL;

  constructor() {

    // SSR-safe: solo ver cookies si estamos en browser
    if (isBrowser()) {
      //console.log('Cookies disponibles:', this.cookies.getAll());

      const saved = readUserCookie(this.cookies);
      if (saved) {
        //console.log('Usuario cargado desde cookie:', saved);
        this.currentUser.set(saved);
      } else {
        console.log('No se encontró usuario en cookie');
      }
    }
  }

  login(username: string, password: string) {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          // No guardamos el token porque es HttpOnly y ya lo guarda el backend
          // Solo persistimos los datos del usuario
          if (isBrowser()) {
            this.cookies.set('user', JSON.stringify(res.user), {
              path: '/',
              sameSite: 'Lax',
            });
          }
          this.currentUser.set(res.user);
        })
      );
  }

  async logout() {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/auth/logout`, {}));

      if (isBrowser()) {
        this.cookies.delete('user', '/');
      }

      this.currentUser.set(null);
      this.toast.success('Sesión cerrada correctamente');
    } catch (err) {
      console.error(err);
      this.toast.error('Error al cerrar sesión');
    }
  }

  async logoutWaiter(): Promise<any[]> {
  return await firstValueFrom(
    this.http.get<any[]>(`${this.apiUrl}/auth/waiter_sessions`)
  );
}

  // Token NO debería existir aquí (es HttpOnly), pero lo dejamos por compatibilidad
  get token(): string | null {
    return isBrowser() ? this.cookies.get('access_token') || null : null;
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  ensureSession$() {
    // SSR-safe: si ya tenemos user local, retornamos
    if (this.currentUser()) return of(this.currentUser());

    // Llamada al backend (en SSR también está OK)
    return this.http.get('/api/auth/me', { withCredentials: true }).pipe(
      tap((u) => this.currentUser.set(u as any)),
      catchError(() => of(null))
    );
  }

  isLoggedIn$() {
    return this.ensureSession$().pipe(map(Boolean));
  }

  getUserFromCookie() {
    if (!isBrowser()) return null;
    try {
      const raw = this.cookies.get('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

}

function readUserCookie(cookies: SafeCookieService) {
  try {
    if (!isBrowser()) return null;
    const raw = cookies.get('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

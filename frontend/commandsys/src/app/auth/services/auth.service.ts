// src/app/features/auth/services/auth.service.ts
import { CookieService } from 'ngx-cookie-service';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export type Role = 'Admin' | 'Gerente' | 'Cajero' | 'Mesero' | 'Cocinero' | 'Bartender';

export interface LoginResponse {
  access_token: string; // lo que te devuelva tu backend
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
  userSig = signal<any | null>(null);

  apiUrl = 'http://localhost:3000/api'; 

  login(username: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(tap((res) => {
        this.cookies.set('access_token', res.access_token, { path: '/', sameSite: 'Lax' });
        // si quieres persistir usuario (no sensible), puedes guardarlo en otra cookie:
        this.cookies.set('user', JSON.stringify(res.user), { path: '/', sameSite: 'Lax' });
        this.userSig.set(res.user);
      }));
  }

  logout() {
    this.cookies.delete('access_token', '/');
    this.cookies.delete('user', '/');
    this.userSig.set(null);
  }

  get token(): string | null {
    const t = this.cookies.get('access_token');
    return t || null;
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }
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

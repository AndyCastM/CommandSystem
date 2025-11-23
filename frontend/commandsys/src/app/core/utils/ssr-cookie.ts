import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { isBrowser } from './platform';

@Injectable({ providedIn: 'root' })
export class SafeCookieService {
  constructor(private realCookies: CookieService) {}

  get(name: string): string {
    return isBrowser() ? this.realCookies.get(name) : '';
  }

  getAll(): { [key: string]: string } {
    return isBrowser() ? this.realCookies.getAll() : {};
  }

  set(name: string, value: string, options?: any) {
    if (isBrowser()) this.realCookies.set(name, value, options);
  }

  delete(name: string, path?: string) {
    if (isBrowser()) this.realCookies.delete(name, path);
  }
}

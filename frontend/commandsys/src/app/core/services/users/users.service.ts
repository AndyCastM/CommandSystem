import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUser, User } from './user.model';
import { sign } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { map} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private base = 'http://localhost:3000/api/users';

  users = signal<User[]>([]);
  loading = signal(false);

  constructor(private http: HttpClient) {}

  async load() {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http
          .get<{ data: User[] }>(this.base, { withCredentials: true })
          .pipe(map((res) => res.data)) 
      );
      this.users.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  getUsers(): Observable<User[]> {
    return this.http
      .get<{ data: User[] }>(this.base, { withCredentials: true })
      .pipe(map((res) => res.data));
  }

  createUser(data: CreateUser): Observable<any> {
    return this.http.post(this.base, data);
  }

  updateUser(id: number, data: Partial<CreateUser>): Observable<any> {
    return this.http.patch(`${this.base}/${id}`, data);
  }

  deleteUser(id: number){
    return this.http.delete(`${this.base}/${id}`);
  }

  activeUser(id: number) {
    return this.http.patch(`${this.base}/${id}/activate`, {});
  }

  getUsersByCompany(id_company: number){
    return this.http.get(`${this.base}/${id_company}`);
  }
}

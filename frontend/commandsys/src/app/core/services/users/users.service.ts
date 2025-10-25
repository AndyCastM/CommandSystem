import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUser, UpdateUser, User } from './user.model';
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

  async createUser(data: CreateUser) {
    const created = await firstValueFrom(
      this.http.post<User>(this.base, data, { withCredentials: true })
    );
    return created;
  }

  async updateUser(id: number, dto: UpdateUser) {
      const updated = await firstValueFrom(
        this.http.patch<User>(`${this.base}/${id}`, dto, { withCredentials: true })
      );
      this.users.update(list => list.map(u => u.id_user=== id ? updated : u));
      return updated;
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

  getUserById(id_user: number){
    return this.http.get(`${this.base}/${id_user}`);
  }
}

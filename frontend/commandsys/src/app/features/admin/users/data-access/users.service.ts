import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUser } from './user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private base = '/api/users';

  constructor(private http: HttpClient) {}

  getUsers(params?: any): Observable<CreateUser[]> {
    return this.http.get<CreateUser[]>(this.base, { params });
  }

  createUser(data: CreateUser): Observable<any> {
    return this.http.post(this.base, data);
  }

  updateUser(id: number, data: Partial<CreateUser>): Observable<any> {
    return this.http.patch(`${this.base}/${id}`, data);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}

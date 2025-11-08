import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CombosService {
  constructor(private http: HttpClient) {}
  private baseUrl = 'http://localhost:3000/api';

  getAll() {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/combos`));
  }

  create(data: any) {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/combos`, data));
  }

  getById(id: number) {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/combos/${id}`));
  }
}

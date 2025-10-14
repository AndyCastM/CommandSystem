import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  available: boolean;
  image: string;
  category: 'Cocina' | 'Bebidas' | 'Postres' | 'Otros';
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private _products$ = new BehaviorSubject<Product[]>([
    {
      id: 1,
      name: 'Taco Asada',
      description: 'Taco de asada en tortilla de maíz/harina',
      price: 50,
      available: true,
      image: 'https://images.unsplash.com/photo-1604467794349-0b74285de7e8?q=80&w=600&auto=format&fit=crop',
      category: 'Cocina',
    },
    {
      id: 2,
      name: 'Mixta de Asada',
      description: 'Mixta asada con tortilla de maíz/harina',
      price: 60,
      available: true,
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=600&auto=format&fit=crop',
      category: 'Cocina',
    },
    {
      id: 3,
      name: 'Papa Asada',
      description: 'Papa asada con extras de tortillas',
      price: 120,
      available: false,
      image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=600&auto=format&fit=crop',
      category: 'Cocina',
    },
    {
      id: 4,
      name: 'Pellizcada',
      description: 'Pellizcada de tortilla de maíz',
      price: 140,
      available: false,
      image: 'https://images.unsplash.com/photo-1550547660-8b8b5d9a3f2f?q=80&w=600&auto=format&fit=crop',
      category: 'Cocina',
    },
    {
      id: 5,
      name: 'Limonada',
      description: 'Refrescante',
      price: 30,
      available: true,
      image: 'https://images.unsplash.com/photo-1556679343-c7306c2e1f0c?q=80&w=600&auto=format&fit=crop',
      category: 'Bebidas',
    },
    {
      id: 6,
      name: 'Café',
      description: 'Americano',
      price: 25,
      available: true,
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop',
      category: 'Bebidas',
    },
  ]);

  // señal derivada para facilidad con Angular Signals
  productsSig = signal(this._products$.value);
  private syncSig = this._products$.subscribe(list => this.productsSig.set(list));

  list() {
    return this._products$.asObservable();
  }

  update(id: number, patch: Partial<Product>) {
    const next = this._products$.value.map(p => (p.id === id ? { ...p, ...patch } : p));
    this._products$.next(next);
  }

  remove(id: number) {
    this._products$.next(this._products$.value.filter(p => p.id !== id));
  }

  create(input: Omit<Product, 'id'>) {
    const id = Math.max(0, ...this._products$.value.map(p => p.id)) + 1;
    this._products$.next([{ id, ...input }, ...this._products$.value]);
  }
}

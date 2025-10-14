import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sb = inject(MatSnackBar);

  success(msg: string, action = 'OK', duration = 3000) {
    this.sb.open(msg, action, { duration, panelClass: ['bg-green-600','text-white'] as any });
  }
  error(msg: string, action = 'OK', duration = 4000) {
    this.sb.open(msg, action, { duration, panelClass: ['bg-red-600','text-white'] as any });
  }
  info(msg: string, action = 'OK', duration = 3000) {
    this.sb.open(msg, action, { duration, panelClass: ['bg-slate-800','text-white'] as any });
  }
}

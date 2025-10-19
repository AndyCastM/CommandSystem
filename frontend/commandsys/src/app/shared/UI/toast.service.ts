import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { ToastComponent } from './toast.component';

type Variant = 'success' | 'error' | 'info' | 'warning';

interface ToastOpts {
  title?: string;
  message: string;
  variant?: Variant;
  duration?: number; // ms
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sb = inject(MatSnackBar);

  private open(opts: ToastOpts) {
    const {
      title = this.defaultTitle(opts.variant),
      message,
      variant = 'info',
      duration = this.defaultDuration(variant),
    } = opts;

    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-container'], // contenedor limpio
      data: { title, message, variant },
    };

    const ref = this.sb.openFromComponent(ToastComponent, config);
    // Pasar @Input() al componente
    const instance = ref.instance;
    instance.title = title;
    instance.message = message;
    instance.variant = variant;
    return ref;
  }

  success(message: string, title = 'Éxito', duration?: number) {
    return this.open({ title, message, variant: 'success', duration });
  }
  error(message: string, title = 'Error', duration?: number) {
    return this.open({ title, message, variant: 'error', duration });
  }
  info(message: string, title = 'Información', duration?: number) {
    return this.open({ title, message, variant: 'info', duration });
  }
  warning(message: string, title = 'Aviso', duration?: number) {
    return this.open({ title, message, variant: 'warning', duration });
  }

  private defaultTitle(v?: Variant) {
    return v === 'success' ? 'Éxito'
         : v === 'error'   ? 'Error'
         : v === 'warning' ? 'Aviso'
         : 'Información';
  }
  private defaultDuration(v: Variant) {
    return v === 'error' ? 5000 : 3200;
  }
}

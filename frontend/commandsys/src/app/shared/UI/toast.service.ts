import { Injectable, ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, inject } from '@angular/core';
import { ToastComponent } from './toast.component';

type Variant = 'success' | 'error' | 'info' | 'warning';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  success(message: string, title = 'Éxito', duration = 3000) {
    this.show({ title, message, variant: 'success', duration });
  }
  error(message: string, title = 'Error', duration = 4000) {
    this.show({ title, message, variant: 'error', duration });
  }
  info(message: string, title = 'Información', duration = 3000) {
    this.show({ title, message, variant: 'info', duration });
  }
  warning(message: string, title = 'Aviso', duration = 5000) {
    this.show({ title, message, variant: 'warning', duration });
  }

  private show({ title, message, variant, duration }: { title: string; message: string; variant: Variant; duration: number }) {
    // Crear componente dinámicamente
    const compRef: ComponentRef<ToastComponent> = createComponent(ToastComponent, {
      environmentInjector: this.injector,
    });

    compRef.instance.title = title;
    compRef.instance.message = message;
    compRef.instance.variant = variant;
    compRef.instance.close.subscribe(() => this.remove(compRef));

    // Insertar en DOM
    this.appRef.attachView(compRef.hostView);
    const el = (compRef.hostView as any).rootNodes[0] as HTMLElement;

    // Crear contenedor global si no existe
    let container = document.querySelector('.toast-container') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container fixed top-4 right-4 z-[9999] flex flex-col gap-3';
      document.body.appendChild(container);
    }

    // Agregar toast
    container.appendChild(el);

    // Quitar automáticamente después del tiempo indicado
    setTimeout(() => this.remove(compRef), duration);
  }

  private remove(compRef: ComponentRef<ToastComponent>) {
    this.appRef.detachView(compRef.hostView);
    compRef.destroy();
  }
}

import {
  Injectable,
  ApplicationRef,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
  inject,
} from '@angular/core';
import { ToastComponent } from './toast.component';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

type Variant = 'success' | 'error' | 'info' | 'warning';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);
  private platformId = inject(PLATFORM_ID);

  success(msg: string, title = 'Éxito', duration = 3000) {
    this.show({ title, msg, variant: 'success', duration });
  }
  error(msg: string, title = 'Error', duration = 4000) {
    this.show({ title, msg, variant: 'error', duration });
  }
  info(msg: string, title = 'Info', duration = 3000) {
    this.show({ title, msg, variant: 'info', duration });
  }
  warning(msg: string, title = 'Aviso', duration = 5000) {
    this.show({ title, msg, variant: 'warning', duration });
  }

  private show({
    title,
    msg,
    variant,
    duration,
  }: {
    title: string;
    msg: string;
    variant: Variant;
    duration: number;
  }) {
    //  SSR-SAFE: si NO estamos en browser, NO mostramos toasts
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const compRef: ComponentRef<ToastComponent> = createComponent(
      ToastComponent,
      {
        environmentInjector: this.injector,
      }
    );

    compRef.instance.title = title;
    compRef.instance.message = msg;
    compRef.instance.variant = variant;

    compRef.instance.close.subscribe(() => this.remove(compRef));

    this.appRef.attachView(compRef.hostView);
    const el = (compRef.hostView as any).rootNodes[0] as HTMLElement;

    let container = document.querySelector('.toast-container') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.className =
        'toast-container fixed top-4 right-4 z-[9999] flex flex-col gap-3';
      document.body.appendChild(container);
    }

    container.appendChild(el);

    setTimeout(() => this.remove(compRef), duration);
  }

  private remove(compRef: ComponentRef<ToastComponent>) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.appRef.detachView(compRef.hostView);
    compRef.destroy();
  }
}

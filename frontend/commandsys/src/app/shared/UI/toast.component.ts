import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div
      class="flex items-start gap-3 p-3 pr-2 rounded-xl shadow-md border
             bg-white text-slate-800 min-w-[260px] max-w-[420px]
             animate-slide-in hover:translate-x-1 transition-transform duration-200">
      <div class="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
           [ngClass]="{
             'bg-emerald-100 text-emerald-700': variant==='success',
             'bg-rose-100 text-rose-700':       variant==='error',
             'bg-sky-100 text-sky-700':         variant==='info',
             'bg-amber-100 text-amber-700':     variant==='warning'
           }">
        <span class="material-symbols-outlined text-[20px] leading-none">{{ icon }}</span>
      </div>

      <div class="flex-1">
        <div class="text-[13px] font-semibold">{{ title }}</div>
        <div class="text-[13px] text-slate-600 mt-0.5 leading-snug">{{ message }}</div>
      </div>

      <button class="p-1 rounded-md hover:bg-slate-100" (click)="close.emit()">
        <span class="material-symbols-outlined text-[18px] text-slate-500">close</span>
      </button>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }
  `],
})
export class ToastComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() variant: 'success' | 'error' | 'info' | 'warning' = 'info';
  @Output() close = new EventEmitter<void>();

  get icon() {
    return this.variant === 'success' ? 'check_circle'
         : this.variant === 'error'   ? 'error'
         : this.variant === 'warning' ? 'warning'
         : 'info';
  }
}

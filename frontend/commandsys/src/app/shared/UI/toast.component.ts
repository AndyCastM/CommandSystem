import { Component, inject, Input } from '@angular/core';
import { MatSnackBarRef } from '@angular/material/snack-bar';
import { NgClass } from '@angular/common';          
import { MatIconModule } from '@angular/material/icon'; 
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [NgClass, MatIconModule],
  template: `,
    <div class="flex items-start gap-3 p-3 pr-2 rounded-xl shadow-md border
                bg-white text-slate-800 min-w-[260px] max-w-[420px]">

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

      <button class="p-1 rounded-md hover:bg-slate-100" (click)="ref.dismiss()">
        <span class="material-symbols-outlined text-[18px] text-slate-500">close</span>
      </button>
    </div>
  `,
  styleUrls: ['toast.css'],
})
export class ToastComponent {
  ref = inject(MatSnackBarRef<ToastComponent>);
  @Input() message = '';
  @Input() title = '';
  @Input() variant: 'success' | 'error' | 'info' | 'warning' = 'info';

  get icon() {
    return this.variant === 'success' ? 'check_circle'
         : this.variant === 'error'   ? 'error'
         : this.variant === 'warning' ? 'warning'
         : 'info';
  }
}

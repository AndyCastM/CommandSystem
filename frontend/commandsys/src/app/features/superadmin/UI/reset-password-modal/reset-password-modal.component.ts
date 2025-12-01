import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        
        <!-- HEADER -->
        <div class="bg-gradient-to-r from-sky-50 via-white to-sky-50 p-5 border-b border-slate-200">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                <mat-icon class="text-sky-600">lock_reset</mat-icon>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-800">
                  Restablecer Contraseña
                </h3>
                <p class="text-sm text-slate-500">
                  {{ user.name }} {{ user.last_name }}
                </p>
              </div>
            </div>
            
            <button 
              (click)="close()" 
              class="text-slate-400 hover:text-slate-600"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <!-- BODY -->
        <div class="p-5 space-y-4">
          <!-- Info del usuario -->
          <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p class="text-sm text-slate-600">
              <span class="font-medium text-slate-800">Usuario:</span> {{ user.username }}
            </p>
            <p class="text-sm text-slate-600">
              <span class="font-medium text-slate-800">Rol:</span> {{ user.role_name }}
            </p>
          </div>

          <!-- Campo de nueva contraseña -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">
              Nueva contraseña
            </label>
            <div class="relative">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="newPassword"
                placeholder="Ingresa la nueva contraseña"
                class="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10
                       focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none
                       text-sm"
                (keyup.enter)="confirm()"
              />
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <mat-icon class="!text-[20px]">
                  {{ showPassword() ? 'visibility_off' : 'visibility' }}
                </mat-icon>
              </button>
            </div>
            
            <!-- Validaciones -->
            <div class="mt-2 space-y-1">
              <p 
                class="text-xs flex items-center gap-1"
                [ngClass]="newPassword.length >= 6 ? 'text-green-600' : 'text-slate-400'"
              >
                <mat-icon class="!text-[14px]">
                  {{ newPassword.length >= 6 ? 'check_circle' : 'cancel' }}
                </mat-icon>
                Mínimo 6 caracteres
              </p>
            </div>
          </div>

          <!-- Advertencia -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
            <mat-icon class="text-yellow-600 !text-[20px]">warning</mat-icon>
            <p class="text-xs text-yellow-800">
              El usuario deberá usar esta nueva contraseña en su próximo inicio de sesión.
            </p>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="p-5 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button
            (click)="close()"
            class="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg
                   text-slate-700 hover:bg-white transition-all text-sm font-medium"
          >
            Cancelar
          </button>
          
          <button
            (click)="confirm()"
            [disabled]="!isValid() || loading()"
            class="flex-1 px-4 py-2.5 bg-sky-600 text-white rounded-lg
                   hover:bg-sky-700 transition-all text-sm font-medium
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
          >
            <mat-icon *ngIf="loading()" class="animate-spin !text-[18px]">sync</mat-icon>
            {{ loading() ? 'Guardando...' : 'Restablecer contraseña' }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class ResetPasswordModalComponent {
  @Input() user!: any;
  @Input() close!: () => void;
  @Input() onConfirm!: (password: string) => Promise<void>;

  newPassword = '';
  showPassword = signal(false);
  loading = signal(false);

  isValid(): boolean {
    return this.newPassword.length >= 6;
  }

  async confirm() {
    if (!this.isValid()) return;

    this.loading.set(true);
    try {
      await this.onConfirm(this.newPassword);
      this.close();
    } catch (err) {
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }
}

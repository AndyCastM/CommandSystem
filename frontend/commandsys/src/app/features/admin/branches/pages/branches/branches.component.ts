import { Component, computed, inject, signal, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { MatCardModule } from '@angular/material/card'; 
import { MatButtonModule } from '@angular/material/button'; 
import { MatSelectModule } from '@angular/material/select'; 
import { MatDialog } from '@angular/material/dialog'; 
import { isPlatformBrowser } from '@angular/common'; 
import { Branch } from '../../data-access/branches.models'; 
import { BranchesApi } from '../../data-access/branches.api'; 
import { BranchDialogComponent, DialogData } from '../../UI/branch-dialog.component'; 
import { ToastService } from '../../../../../shared/UI/toast.service';
import { firstValueFrom } from 'rxjs';

type FilterState = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-branches-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSelectModule ],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css',
})
export class BranchesPageComponent {
  private toast = inject(ToastService);
  private api = inject(BranchesApi);
  private dialog = inject(MatDialog);

  companyId = signal<number>(1);
  estado = signal<FilterState>('all');

  // lee el signal del servicio (¡bien!)
  branches = computed<Branch[]>(() => this.api.branches());
  total = computed(() => this.branches().length);
  activas = computed(() => this.branches().filter(b => b.is_active).length);
  inactivas = computed(() => this.total() - this.activas());

  // ---- PENDING como signal ----
  private _pendingIds = signal<Set<number>>(new Set());
  isPending = (id?: number | null) => !!id && this._pendingIds().has(id ?? -1);
  private setPending(id: number | undefined, on: boolean) {
    if (!id) return;
    this._pendingIds.update(s => {
      const next = new Set(s);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  rows = computed<Branch[]>(() => {
    const list = this.branches();
    switch (this.estado()) {
      case 'active': return list.filter(b => b.is_active);
      case 'inactive': return list.filter(b => !b.is_active);
      default: return list;
    }
  });

  displayedColumns = ['name','address','phone','email','status','actions'];

  constructor() {
    const platformId = inject(PLATFORM_ID);

    // Cargar reactivamente al cambiar companyId (y solo en browser/CSR)
    effect(async () => {
      if (!isPlatformBrowser(platformId)) return;
      const id = this.companyId();
      await this.api.load(); // ← ahora acepta companyId (ver servicio)
    });
  }

  async openCreate() {
    const data: DialogData = { mode: 'create' };
    const ref = this.dialog.open(BranchDialogComponent, {
      data,
      width: '720px',
      autoFocus: false
    });

    const payload = await firstValueFrom(ref.afterClosed());
    if (!payload) return;

    try {
      await this.api.create(payload);
      this.toast.success('Sucursal creada correctamente');
    } catch (e: any) {
      this.toast.error('No se pudo crear la sucursal');
      console.error(e);
    }
  }

  async openEdit(b: Branch) {
    const ref = this.dialog.open(BranchDialogComponent, {
      width: '720px',
      data: { mode: 'edit', value: b } as const,
    });

    const value = await firstValueFrom(ref.afterClosed());
    if (!value) return;

    try {
      await this.api.update(b.id_branch!, value);
      this.toast.success('Sucursal actualizada');
    } catch (e) {
      this.toast.error('No se pudo actualizar la sucursal');
      console.error(e);
    }
  }

  async toggleActive(b: Branch) {
    const id = b.id_branch!;
    const targetActive = !Boolean(b.is_active);

    // Optimista: actualiza signal con inmutabilidad (nuevo arreglo)
    const revert = this.api.optimisticSetActive(id, targetActive);
    this.setPending(id, true);

    try {
      // Llama a la API
      if (targetActive) {
        await this.api.activate(id);
      } else {
        await this.api.deactivate(id);
      }
      this.toast.success(`Sucursal ${targetActive ? 'activada' : 'desactivada'} correctamente`);
    } catch (err) {
      this.toast.error(`No se pudo ${targetActive ? 'activar' : 'desactivar'} la sucursal`);
      console.error(err);
    } finally {
      this.setPending(id, false);
    }
  }

}

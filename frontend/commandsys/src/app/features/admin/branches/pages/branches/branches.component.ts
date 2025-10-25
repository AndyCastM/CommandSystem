import { Component, computed, inject, signal, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { Branch } from '../../data-access/branches.models';
import { BranchesApi } from '../../data-access/branches.api';
import { BranchDialogComponent, DialogData } from '../../UI/branch-dialog.component';
import { ToastService } from '../../../../../shared/UI/toast.service';

type FilterState = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-branches-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSelectModule],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css',
})
export class BranchesPageComponent {
  private toast = inject(ToastService);
  private api = inject(BranchesApi);
  private dialog = inject(MatDialog);

  companyId = signal<number>(1);
  estado = signal<FilterState>('all');

  // lee SIEMPRE del store del servicio
  branches = computed<Branch[]>(() => this.api.branches());
  total = computed(() => this.branches().length);
  actives = computed(() => this.branches().filter(b => b.is_active).length);
  inactives = computed(() => this.total() - this.actives());

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
    effect(async () => {
      if (!isPlatformBrowser(platformId)) return;
      await this.api.load(); // carga inicial (y cuando cambies companyId si aplica)
    });
  }

  async openCreate() {
    const ref = this.dialog.open(BranchDialogComponent, {
      data: { mode: 'create' } as DialogData,
      width: '720px',
      autoFocus: false
    });

    const created = await firstValueFrom(ref.afterClosed());
    if (!created) return;

    this.api.prependToList(created);
  }

  async openEdit(b: Branch) {
    const ref = this.dialog.open(BranchDialogComponent, {
      width: '720px',
      data: { mode: 'edit', value: b } as const,
    });

    const updated = await firstValueFrom(ref.afterClosed());
    if (!updated) return;

    this.api.replaceInList(updated);
  }

  async toggleActive(b: Branch) {
    const id = b.id_branch!;
    const targetActive = !Boolean(b.is_active);

    const revert = this.api.optimisticSetActive(id, targetActive);
    this.setPending(id, true);

    try {
      if (targetActive) await this.api.activate(id);
      else await this.api.deactivate(id);
      this.toast.success(`Sucursal ${targetActive ? 'activada' : 'desactivada'} correctamente`);
    } catch (err) {
      revert();
      this.toast.error(`No se pudo ${targetActive ? 'activar' : 'desactivar'} la sucursal`);
      console.error(err);
    } finally {
      this.setPending(id, false);
    }
  }
}

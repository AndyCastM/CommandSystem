import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';

import { Branch } from '../../data-access/branches.models';
import { BranchesApi } from '../../data-access/branches.api';
import { BranchDialogComponent } from '../../UI/branch-dialog.component';

type FilterState = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-branches-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSelectModule],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css',
})
export class BranchesPageComponent {
  private api = inject(BranchesApi);
  private dialog = inject(MatDialog);

  // en producción léelo del usuario/tenant
  companyId = signal<number>(1);

  // filtro
  estado = signal<FilterState>('all');

  branches = computed<Branch[]>(() => this.api.branches());
  total = computed(() => this.branches().length);
  activas = computed(() => this.branches().filter(b => b.is_active).length);
  inactivas = computed(() => this.total() - this.activas());

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
    this.api.load();
  }

  openCreate() {
    const ref = this.dialog.open(BranchDialogComponent, {
      width: '720px',
      data: { mode: 'create' } as const,
    });
    ref.afterClosed().subscribe(async (value) => {
      if (!value) return;
      await this.api.create(this.companyId(), { id_company: this.companyId(), ...value });
    });
  }

  openEdit(b: Branch) {
    const ref = this.dialog.open(BranchDialogComponent, {
      width: '720px',
      data: { mode: 'edit', value: b } as const,
    });
    ref.afterClosed().subscribe(async (value) => {
      if (!value) return;
      await this.api.update(this.companyId(), b.id_branch, value);
    });
  }

  async toggleActive(b: Branch) {
    await this.api.setActive(this.companyId(), b.id_branch, !b.is_active);
  }
}

import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { BranchSchedulesApi } from '../../../core/services/branches/branches-schedules.api';
import { ToastService } from '../../../shared/UI/toast.service';
import { BranchesApi } from '../../../core/services/branches/branches.api';
import { isPlatformBrowser } from '@angular/common';

const DAY_MAP = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 0, name: 'Domingo' }
];

@Component({
  selector: 'app-manager-settings',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSlideToggleModule, FormsModule],
  templateUrl: './manager-settings.html',
  styleUrl: './manager-settings.css',
})
export class ManagerSettings implements OnInit{
  private fb = inject(FormBuilder);
  private api = inject(BranchSchedulesApi);
  private toast = inject(ToastService);
  private branchesApi = inject(BranchesApi);

  loading = signal(true);

  form = this.fb.group({
    name: ['', Validators.required],
    address: [''],
    phone: [''],
    email: ['', [Validators.email]],
  });

  days = signal<
    { day_of_week: number; name: string; enabled: boolean; open: string; close: string; changed?: boolean }[]
  >([]);

  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async ngOnInit() {
    if (!this.isBrowser) return;
    this.form.disable();
    this.loadBranchInfo();

    try {
      const data = await this.api.getByBranch();

      this.days.set(
        data.map((d) => ({
          day_of_week: d.day_of_week,
          name: this.getDayName(d.day_of_week),
          enabled: d.is_open,
          open: this.formatTime(d.open_time),
          close: this.formatTime(d.close_time),
          changed: false,
        }))
      );
    } catch (err) {
      this.toast.error('No se pudieron cargar los horarios');
    } finally {
      this.loading.set(false);
    }
  }

  async loadBranchInfo() {
    try {
      const data = await this.branchesApi.getById();
      const addressParts = [data.street, data.num_ext ? `#${data.num_ext}` : '', data.colony, data.city, data.state];
      const fullAddress = addressParts.filter(Boolean).join(', ');

      this.form.patchValue({
        name: data.name || '',
        address: fullAddress || '',
        phone: data.phone || '',
        email: data.email || '',
      });
    } catch (err) {
      console.error(err);
      this.toast.error('Error al cargar los datos del restaurante');
    }
  }

  getDayName(i: number) {
    return DAY_MAP.find((d) => d.id === i)?.name ?? 'Desconocido';
  }

  formatTime(isoTime: string) {
    const date = new Date(isoTime);
    return date.toISOString().substring(11, 16); // "HH:mm"
  }

  // Toggle día abierto/cerrado
  async toggleDay(day: any) {
    try {
      await this.api.toggleDay(day.day_of_week, day.enabled);
      this.toast.success(`Día ${day.name} ${day.enabled ? 'activado' : 'desactivado'}`);
    } catch (err) {
      this.toast.error('Error al cambiar el estado del día');
    }
  }

  // Detectar cambios de hora
  markDayChanged(day: any, field: 'open' | 'close', value: string) {
    day[field] = value;
    day.changed = true;
  }

  // Actualizar solo un día
  async updateDay(day: any) {
    try {
      console.log(day);
      await this.api.updateDay({
        day_of_week: day.day_of_week,
        open_time: day.open,
        close_time: day.close,
      });
      day.changed = false;
      this.toast.success(`Horario de ${day.name} actualizado`);
    } catch (err) {
      this.toast.error('Error al actualizar el horario');
    }
  }

  // Guardar solo días modificados
  async saveSchedule() {
    const changedDays = this.days().filter((d) => d.changed);

    if (changedDays.length === 0) {
      this.toast.info('No hay cambios que guardar');
      return;
    }

    const updatedList = [...this.days()];

    for (const day of changedDays) {
      try {
        await this.updateDay(day);
        const index = updatedList.findIndex(d => d.day_of_week === day.day_of_week);
        if (index !== -1) updatedList[index].changed = false; // marcar como guardado
      } catch (err) {
        console.error(`Error actualizando ${day.name}:`, err);
      }
    }

    // Refrescar el signal completo
    this.days.set(updatedList);
  }

}

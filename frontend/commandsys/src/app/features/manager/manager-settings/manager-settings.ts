import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { BranchSchedulesApi } from '../../../core/services/branches/branches-schedules.api';
import { ToastService } from '../../../shared/UI/toast.service';
import { BranchesApi } from '../../../core/services/branches/branches.api';
@Component({
  selector: 'app-manager-settings',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSlideToggleModule, FormsModule],
  templateUrl: './manager-settings.html',
  styleUrl: './manager-settings.css',
})
export class ManagerSettings {
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
    { day_of_week: number; name: string; enabled: boolean; open: string; close: string }[]
  >([]);

  async ngOnInit() {
    this.form = this.fb.group({
      name: [{ value: '', disabled: true }],
      address: [{ value: '', disabled: true }],
      phone: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }],
    });

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
        }))
      );
    } catch (err) {
      this.toast.error('No se pudieron cargar los horarios');
    }
  }

  async loadBranchInfo() {
    try {
      const data = await this.branchesApi.getById();

      // Concatenar la dirección completa 
      const addressParts = [
        data.street,
        data.num_ext ? `#${data.num_ext}` : '',
        data.colony,
        data.city,
        data.state,
      ];

      const fullAddress = addressParts.filter(Boolean).join(', ');

      // Rellenar el formulario
      this.form.patchValue({
        name: data.name || '',
        address: fullAddress || '',
        phone: data.phone || '',
        email: data.email || '',
      });

    } catch (err) {
      console.error(err);
      this.toast.error('Error al cargar los datos del restaurante');
    } finally {
      this.loading.set(false);
    }
  }

  getDayName(i: number) {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[i];
  }

  formatTime(isoTime: string) {
    const date = new Date(isoTime);
    return date.toISOString().substring(11, 16); // HH:mm
    // Ejemplo: "1970-01-01T09:00:00Z" → "09:00"
  }

  async toggleDay(day: any) {
    try {
      await this.api.toggleDay(day.day_of_week, day.enabled);
      this.toast.success(`Día ${day.name} ${day.enabled ? 'activado' : 'desactivado'}`);
    } catch (err) {
      this.toast.error('Error al cambiar el estado del día');
    }
  }

  async updateDay(day: any) {
    try {
      await this.api.updateDay({
        day_of_week: day.day_of_week,
        open_time: day.open,
        close_time: day.close,
      });
      this.toast.success(`Horario de ${day.name} actualizado`);
    } catch (err) {
      this.toast.error('Error al actualizar el horario');
    }
  }

  saveInfo() {
    console.log('Guardando información:', this.form.value);
  }

  async saveSchedule() {
    console.log('Guardando horarios:', this.days());
    for (const day of this.days()) {
      await this.updateDay(day);
    }
  }
 }

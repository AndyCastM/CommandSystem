import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manager-settings',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSlideToggleModule, FormsModule],
  templateUrl: './manager-settings.html',
  styleUrl: './manager-settings.css',
})
export class ManagerSettings {
   private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', Validators.required],
    address: [''],
    phone: [''],
    email: ['', [Validators.email]],
  });

  days = signal([
    { name: 'Lunes', enabled: true, open: '12:00', close: '20:00' },
    { name: 'Martes', enabled: true, open: '12:00', close: '20:00' },
    { name: 'Miércoles', enabled: true, open: '12:00', close: '20:00' },
    { name: 'Jueves', enabled: true, open: '12:00', close: '20:00' },
    { name: 'Viernes', enabled: true, open: '12:00', close: '20:00' },
    { name: 'Sábado', enabled: false, open: '12:00', close: '20:00' },
    { name: 'Domingo', enabled: false, open: '12:00', close: '20:00' },
  ]);

  saveInfo() {
    console.log('Guardando información:', this.form.value);
  }

  saveSchedule() {
    console.log('Guardando horarios:', this.days());
  }
 }

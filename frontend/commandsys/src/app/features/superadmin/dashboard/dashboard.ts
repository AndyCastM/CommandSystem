import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Superadmin } from '../data-access/superadmin';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CompanyFormComponent } from '../UI/company-form.component';

@Component({
  selector: 'app-dashboard',
  imports: [MatIcon, CommonModule, FormsModule, ReactiveFormsModule, CompanyFormComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  companies = signal<any[]>([]);
  metrics = signal({ companies: 0, users: 0, active: 0, inactive: 0 });
  showModal = signal(false);
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private srv: Superadmin,
    private sb: MatSnackBar
  ) {
    this.form = this.fb.group({
      companyName: ['', Validators.required],
      companyEmail: ['', [Validators.required, Validators.email]],
      companyPhone: [''],
      adminName: ['', Validators.required],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.loadData();
  }

  async loadData() {
    try {
      const res = await this.srv.getDashboard();
      this.companies.set(res.companies);
      this.metrics.set(res.metrics);
    } catch (err) {
      console.error(err);
    }
  }

  openCreateCompanyModal() {
    this.form.reset();
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async createCompany() {
    if (this.form.invalid) {
      this.sb.open('Completa todos los campos requeridos', 'OK', { duration: 3000 });
      return;
    }
    try {
      await this.srv.createCompany(this.form.value);
      this.sb.open('Empresa creada con éxito', 'OK', { duration: 3000 });
      this.showModal.set(false);
      this.loadData();
    } catch (err) {
      console.error(err);
      this.sb.open('Error al crear empresa', 'OK', { duration: 4000 });
    }
  }

  editCompany(c: any) {
    console.log('Editar empresa', c);
  }

  manageUsers(c: any) {
    console.log('Ver usuarios de empresa', c);
  }
 }

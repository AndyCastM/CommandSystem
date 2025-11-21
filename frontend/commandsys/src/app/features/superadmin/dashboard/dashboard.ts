import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Superadmin } from '../data-access/superadmin';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CompanyFormComponent } from '../UI/company-form/company-form.component';
import { ToastService } from '../../../shared/UI/toast.service';
import { UsersSupportModalComponent } from '../UI/users-support-modal/users-support-modal';
import { EditCompanyModalComponent } from '../UI/edit-company-modal/edit-company-modal';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIcon, CommonModule, FormsModule, ReactiveFormsModule, CompanyFormComponent, UsersSupportModalComponent, EditCompanyModalComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  companies = signal<any[]>([]);
  companiesCount = signal(0);
  metrics = signal({ users: 0, active: 0, inactive: 0 });
  showModal = signal(false);
  
  selectedCompany = signal<any | null>(null);
  showUsersModal = signal(false);
  showEditModal = signal(false);
  
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private srv: Superadmin,
    private toast: ToastService,
  ) {
    this.form = this.fb.group({
      companyName: ['', Validators.required],
      companyEmail: ['', [Validators.required, Validators.email]],
      companyPhone: [''],
      adminName: ['', Validators.required],
      adminLastName: ['', Validators.required],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.loadData();
    this.loadMetrics();
  }

  async loadData() {
    try {
      const res = await this.srv.getDashboard();
      this.companies.set(res);
      this.companiesCount.set(res.length);
    } catch (err) {
      console.error(err);
    }
  }

  async loadMetrics() {
    this.srv.getGlobalMetrics().subscribe({
      next: res => {
        const m = res.data; // { total_users, active_users, inactive_users, ... }

        this.metrics.set({
          users: m.total_users ?? 0,
          active: m.active_users ?? 0,
          inactive: m.inactive_users ?? 0,
        });

        //console.log(' Métricas dashboard:', this.metrics());
      },

      error: err => {
        console.error('Error cargando métricas:', err);
      }
    });
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
      this.toast.warning('Completa todos los campos requeridos');
      return;
    }
    try {
      await this.srv.createCompany(this.form.value);
      this.toast.success('Empresa creada con éxito');
      this.showModal.set(false);
      this.loadData();
    } catch (err) {
      console.error(err);
      this.toast.error('Error al crear empresa');
    }
  }

  openUsersSupportModal(c: any) {
    this.selectedCompany.set(c);
    this.showUsersModal.set(true);
  }

  closeUsersModal() {
    this.selectedCompany.set(null);
    this.showUsersModal.set(false);
  }

  openEditCompanyModal(c: any) {
    this.selectedCompany.set(c);
    this.showEditModal.set(true);
  }

  closeEditCompanyModal() {
    this.selectedCompany.set(null);
    this.showEditModal.set(false);
    this.loadData();
  }
 }

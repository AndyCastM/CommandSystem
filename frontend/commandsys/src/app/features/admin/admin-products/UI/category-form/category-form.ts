import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
@Component({
  selector: 'app-area-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIcon],
  templateUrl: './category-form.html'
})
export class CategoryForm {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<CategoryForm>);

  form = this.fb.group({
    name: ['', Validators.required],
    description: ['']
  });

  save() {
    if (this.form.invalid) return;
    this.ref.close(this.form.value.name);
  }
}

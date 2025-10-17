import { Component, Input, Output, EventEmitter, OnDestroy, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-customization-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './customization-form.component.html',
  styleUrls: ['./customization-form.component.css']
})
export class CustomizationFormComponent implements AfterViewChecked, OnDestroy {
  @Input() options!: FormArray<FormGroup>;

  @Output() addOption = new EventEmitter<void>();
  @Output() removeOption = new EventEmitter<number>();
  @Output() addValue = new EventEmitter<number>();
  @Output() removeValue = new EventEmitter<{ optIdx: number; valIdx: number }>();
  @Output() addTier = new EventEmitter<number>();
  @Output() removeTier = new EventEmitter<{ optIdx: number; tierIdx: number }>();

  // Mapa para no duplicar suscripciones por opción
  private wired = new WeakSet<FormGroup>();
  private subs: Subscription[] = [];

  // helpers tipados
  getControl<T = any>(group: FormGroup, name: string): FormControl<T> {
    return group.get(name) as FormControl<T>;
  }
  getArray(group: FormGroup, name: string): FormArray<FormGroup> {
    return group.get(name) as FormArray<FormGroup>;
  }

  /**
   * Se ejecuta en cada ciclo de vista. Cablea (wire) cualquier opción nueva
   * que aún no tenga la lógica de sincronización multi_select <-> max_selection.
   */
  ngAfterViewChecked(): void {
    if (!this.options || !this.options.controls.length) return;
    for (const opt of this.options.controls as FormGroup[]) {
      if (!this.wired.has(opt)) {
        queueMicrotask(() => this.wireOption(opt)); // async evita doble ejecución
        this.wired.add(opt);
      }
    }
  }


  private wireOption(opt: FormGroup) {
    const multi = this.getControl<boolean>(opt, 'multi_select');
    const max = this.getControl<number>(opt, 'max_selection');

    // Enforce estado inicial
    if (!multi.value) {
      if (max.value !== 1) max.setValue(1, { emitEvent: false });
      max.disable({ emitEvent: false });
    } else {
      if ((max.value ?? 1) < 1) max.setValue(1, { emitEvent: false });
      max.enable({ emitEvent: false });
    }

    // Reacciona a cambios
    const s = multi.valueChanges.subscribe(isMulti => {
      if (!isMulti) {
        // fuerza 1 y deshabilita
        if (max.value !== 1) max.setValue(1, { emitEvent: false });
        max.disable({ emitEvent: false });
      } else {
        // habilita y asegura mínimo 1
        max.enable({ emitEvent: false });
        if ((max.value ?? 1) < 1) max.setValue(1, { emitEvent: false });
      }
    });
    
    this.subs.push(s);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}

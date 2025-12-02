import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Area, PrinterConfig } from '../../../../../core/services/printer/printers.model';

@Component({
  selector: 'app-printer-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor],
  templateUrl: './printer-edit-modal.html',
})
export class PrinterEditModalComponent implements OnChanges {

  // Puede ser null al abrir/cerrar modal
  @Input() printer: PrinterConfig | null = null;
  @Input() areas: Area[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() saveChanges = new EventEmitter<{
    displayName: string;
    areaIds: number[];
  }>();

  // Modelo del formulario
  model = signal({
    displayName: '',
    areaIds: [] as number[],
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['printer'] && this.printer) {
      this.model.set({
        displayName: this.printer.displayName,
        areaIds: this.printer.areas.map(a => a.id_area),
      });
    }
  }

  // GETTERS / SETTERS para evitar errores de ngModel con signals
  get displayName() {
    return this.model().displayName;
  }
  set displayName(val: string) {
    this.model.update(m => ({ ...m, displayName: val }));
  }

  get areaIds() {
    return this.model().areaIds;
  }

  toggleArea(idArea: number, checked: boolean) {
    const arr = [...this.model().areaIds];

    if (checked) arr.push(idArea);
    else arr.splice(arr.indexOf(idArea), 1);

    this.model.update(m => ({ ...m, areaIds: arr }));
  }

  save() {
    const m = this.model();
    if (!m.displayName || m.areaIds.length === 0) return;

    this.saveChanges.emit(m);
  }

  close() {
    this.closeModal.emit();
  }
}

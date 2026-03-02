import { CommonModule } from '@angular/common';
import { Component, Input, Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-order-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './app-order-preview.html'
})
export class OrderPreviewComponent {

  @Input() cart!: Signal<Map<string, any>>;
  @Input() totalAmount!: () => number;
  @Input() updateQuantity!: (key: string, change: number) => void;
  @Input() removeFromCart!: (key: string) => void;
  @Input() confirmOrder!: () => void;
  @Input() isAdding = false;

  @Input() groups!: Signal<number[]>;
  @Input() currentGroup!: WritableSignal<number>;
  @Input() addGroup!: () => void;
  @Input() removeEmptyGroup!: (group: number) => void;

  // grupos ya procesados por el padre
  @Input() groupKeys: number[] = [];
  @Input() grouped: { [group: number]: { key: string; value: any }[] } = {};

  generalNotes: string = '';

  getOptionNames(opt: any): string {
    if (!opt?.values || opt.values.length === 0) return '';

    return opt.values
      .map((v: any) => {
        const extra = Number(v.extra_price ?? 0);

        if (extra > 0) {
          return `${v.name} (+$${extra.toFixed(2)})`;
        }

        return v.name;
      })
      .join(', ');
  }

  formatPrice(value: number): string {
    return '$' + Number(value).toFixed(2);
  }

  itemSubtotal(item: any): number {
    const base = Number(item.product?.base_price || 0);
    let extraValuesTotal = 0;
    let tiersTotal = 0;

    for (const opt of item.options || []) {
      // Suma de valores individuales
      extraValuesTotal += (opt.values || []).reduce(
        (acc: number, v: any) => acc + Number(v.extra_price || 0),
        0
      );

      // Suma de Tiers adicionales
      if (opt.multi_select && opt.tiers?.length > 0) {
        const count = (opt.values || []).length;
        const matchingTier = opt.tiers.find((t: any) => Number(t.selection_count) === count);
        if (matchingTier) {
          tiersTotal += Number(matchingTier.extra_price || 0);
        }
      }
    }

    return (base + extraValuesTotal + tiersTotal) * Number(item.quantity || 1);
  }

  getGeneralNotes(): string {
    return this.generalNotes;
  }
}

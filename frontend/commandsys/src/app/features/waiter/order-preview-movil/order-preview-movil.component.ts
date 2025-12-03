import { CommonModule } from '@angular/common';
import { Component, Input, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-order-preview-movil',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './order-preview-movil.html'
})
export class OrderPreviewMovilComponent {

  @Input() cart!: Signal<Map<string, any>>;
  @Input() totalAmount!: () => number;
  @Input() updateQuantity!: (key: string, change: number) => void;
  @Input() removeFromCart!: (key: string) => void;
  @Input() confirmOrder!: () => void;
  @Input() isAdding = false;
  @Input() removeEmptyGroup!: (g: number) => void;

  // Notas generales de la comanda (las lees desde el menú con .generalNotes)
  generalNotes: string = '';

  //  Agrupar items por group_number (1, 2, 3...)
  // Resultado: { 1: [ {key, value}, ... ], 2: [ ... ], ... }
  get groupedByGroup() {
    const map: Record<number, { key: string; value: any }[]> = {};

    for (const [key, value] of this.cart().entries()) {
      const groupNumber = value.group_number || 1;
      if (!map[groupNumber]) {
        map[groupNumber] = [];
      }
      map[groupNumber].push({ key, value });
    }

    return map;
  }

  getOptionNames(opt: any): string {
    if (!opt?.values || opt.values.length === 0) return '';
    return opt.values.map((v: any) => v.name).join(', ');
  }

  formatPrice(value: number): string {
    return '$' + Number(value).toFixed(2);
  }

  itemSubtotal(item: any): number {
    const base = item.product.base_price || 0;
    let extras = 0;

    for (const opt of item.options || []) {
      extras += opt.values?.reduce(
        (acc: number, v: any) => acc + (v.extra_price || 0),
        0
      );

      const optionDetail = item.product.options.find(
        (pOpt: any) => pOpt.id_option === opt.id_option
      );

      if (optionDetail?.tiers?.length > 0) {
        const selectedCount = opt.values?.length || 0;
        const tier = optionDetail.tiers.find(
          (t: any) => selectedCount === t.selection_count
        );
        if (tier) extras += tier.extra_price;
      }
    }

    return (base + extras) * item.quantity;
  }

  getGeneralNotes(): string {
    return this.generalNotes;
  }
}

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
    imports: [CommonModule],
    selector: 'app-confirm-order-dialog',
    templateUrl: './confirm-order-dialog.html',
})
export class ConfirmOrderDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cart: any[], total: number }
  ) {}

  close() {
    this.dialogRef.close();
  }

  confirm() {
    this.dialogRef.close(true);  // Confirmar y proceder con el envío
  }
}

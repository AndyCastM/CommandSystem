export class CreatePaymentDto {
  id_order: number;
  method: 'cash' | 'card' | 'transfer';
  amount: number;
  tip?: number;
}

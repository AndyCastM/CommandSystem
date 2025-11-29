export class CreatePaymentDto {
  // Para pago normal por orden 
  id_order?: number;

  // Para pago por sesión (varias órdenes)
  id_orders?: number[];

  method: 'cash' | 'card' | 'transfer';
  amount: number;
  tip?: number;
}

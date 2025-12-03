import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  // Obtener sesión activa
  async getActiveSession(id_user: number, id_branch: number) {
    return this.prisma.cash_sessions.findFirst({
      where: {
        id_user,
        id_branch,
        is_closed: false,
      }
    });
  }

  private getLocalDate(): Date {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local;
  }
  
  // Abrir turno
  async openSession(id_user: number, id_branch: number, amount: number, notes?: string) {
    const active = await this.getActiveSession(id_user, id_branch);
    if (active) throw new BadRequestException('Ya tienes un turno abierto');

    return this.prisma.cash_sessions.create({
      data: {
        id_user,
        id_branch,
        opened_at: this.getLocalDate(),
        opening_amount: amount,
        notes,
      }
    });
  }

  // Cierre
  async closeSession(id_user: number, id_branch: number, counted_amount: number, notes?: string) {
    const session = await this.getActiveSession(id_user, id_branch);
    if (!session) throw new BadRequestException('No tienes un turno activo');

    // Total cobrado en el turno
    const payments = await this.prisma.payments.findMany({
      where: { id_cash_session: session.id_cash_session }
    });

    const totalCash = payments.filter(p => p.method === 'cash').reduce((a, b) => a + Number(b.amount), 0);
    const totalCard = payments.filter(p => p.method === 'card').reduce((a, b) => a + Number(b.amount), 0);
    const totalTransfer = payments.filter(p => p.method === 'transfer').reduce((a, b) => a + Number(b.amount), 0);
    const tips = payments.reduce((a, b) => a + Number(b.tip ?? 0), 0);

    const expected = Number(session.opening_amount) + totalCash;
    const difference = counted_amount - expected;

    // Cerrar caja
    return this.prisma.cash_sessions.update({
      where: { id_cash_session: session.id_cash_session },
      data: {
        closed_at: this.getLocalDate(),
        closing_amount: counted_amount,
        notes,
        expected_cash: expected,
        difference: difference,
        is_closed: true
      }
    });
  }
}

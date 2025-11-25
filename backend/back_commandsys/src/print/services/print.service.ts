import { Injectable } from '@nestjs/common';
import { PrintGateway } from '../print.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpsertPrinterDto } from '../dto/upsert-printer.dto';

@Injectable()
export class PrintService {
  constructor(private gateway: PrintGateway, private prisma: PrismaService) {}

  sendOrderToPrint(content: any) {
    this.gateway.sendToPrinters({
      content,
      timestamp: Date.now(),
    });
  }

  // Un ticket de prueba
  test() {
    this.sendOrderToPrint("TEST PRINT\nDesde backend hosteado \n");
    return { ok: true };
  }

  async listPrintersByBranch(branchId: number) {
    const stations = await this.prisma.branch_print_stations.findMany({
      where: { id_branch: branchId },
      include: { print_areas: true },
      orderBy: [{ printer_name: 'asc' }, { id_station: 'asc' }],
    });

    // Agrupar por IP+nombre para UI
    const map = new Map<string, {
      printerIp: string;
      displayName: string;
      isActive: number;
      areas: { id_area: number; name: string }[];
    }>();

    for (const s of stations) {
      const key = `${s.printer_ip}::${s.printer_name}`;
      if (!map.has(key)) {
        map.set(key, {
          printerIp: s.printer_ip,
          displayName: s.printer_name,
          isActive: s.is_active,
          areas: [],
        });
      }
      map.get(key)!.areas.push({
        id_area: s.id_area,
        name: s.print_areas.name,
      });
    }

    return Array.from(map.values());
  }

  /**
   * Crea/actualiza una impresora lógica (IP + nombre) con sus áreas.
   * Implementa la lógica de: una impresora puede imprimir varias áreas.
   */
  async upsertPrinter(id_branch: number, dto: UpsertPrinterDto) {
    const { printerIp, displayName, areaIds, isActive = 1 } = dto;

    // 1) Borrar configuraciones actuales de esa impresora en esa sucursal
    await this.prisma.branch_print_stations.deleteMany({
      where: {
        id_branch: id_branch,
        printer_ip: printerIp,
      },
    });

    // 2) Crear una fila por área seleccionada
    const created = await this.prisma.$transaction(
      areaIds.map((idArea) =>
        this.prisma.branch_print_stations.create({
          data: {
            id_branch: id_branch,
            id_area: idArea,
            printer_ip: printerIp,
            printer_name: displayName,
            is_active: isActive,
          },
        }),
      ),
    );

    return created;
  }
}

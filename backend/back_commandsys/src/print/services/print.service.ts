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

  sendTicketToBranch(branchId: number, content: string) {
    this.gateway.sendToBranch(branchId, {
      content,
      timestamp: Date.now(),
    });
  }
  
  // sendRawTicketToBranch(branchId: number, content: string) {
  //   const payload = {
  //     content,
  //     timestamp: Date.now(),
  //   };

  //   this.gateway.emitTicketToBranch(branchId, payload);
  // }

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

  // Agrupar por IP + nombre
  const map = new Map<
    string,
    {
      printerIp: string;
      displayName: string;
      isActive: number;
      ids_station: number[]; // <<--- AQUI AGREGAMOS ESTO
      areas: { id_area: number; name: string }[];
    }
  >();

  for (const s of stations) {
    const key = `${s.printer_ip}::${s.printer_name}`;

    if (!map.has(key)) {
      map.set(key, {
        printerIp: s.printer_ip,
        displayName: s.printer_name,
        isActive: s.is_active,
        ids_station: [],   // <<--- INICIALIZADO
        areas: [],
      });
    }

    const item = map.get(key)!;

    // Guardar ID de estación
    item.ids_station.push(s.id_station);

    // Guardar área
    item.areas.push({
      id_area: s.id_area,
      name: s.print_areas.name,
    });
  }

  return Array.from(map.values());
}


  /**
 * Crea o actualiza una impresora lógica USB
 * usando ids_station para saber qué filas borrar.
 */
  async upsertPrinter(id_branch: number, dto: UpsertPrinterDto) {
    const { displayName, areaIds, ids_station = [], isActive = 1 } = dto;

    // 1) Si vienen ids_station, se borran SOLO esas filas
    if (ids_station.length > 0) {
      await this.prisma.branch_print_stations.deleteMany({
        where: { id_station: { in: ids_station } },
      });
    } else {
      // Si no vienen ids, borramos por nombre (solo para casos viejos)
      await this.prisma.branch_print_stations.deleteMany({
        where: {
          id_branch,
          printer_name: displayName,
        },
      });
    }

    // 2) Crear nuevas filas por cada área seleccionada
    const created = await this.prisma.$transaction(
      areaIds.map((idArea) =>
        this.prisma.branch_print_stations.create({
          data: {
            id_branch,
            id_area: idArea,
            printer_ip: 'USB',        // fijo
            printer_name: displayName,
            is_active: isActive,
          },
        }),
      ),
    );

    return created;
  }

  async disablePrinter(id: number) {
    return this.prisma.branch_print_stations.update({
      where: { id_station: id },
      data: { is_active: 0 }
    });
  }

  async disableManyStations(ids: number[]) {
    return this.prisma.branch_print_stations.updateMany({
      where: { id_station: { in: ids } },
      data: { is_active: 0 }
    });
  }

  async setActiveStatus(ids: number[], status: 0 | 1) {
    return this.prisma.branch_print_stations.updateMany({
      where: { id_station: { in: ids } },
      data: { is_active: status }
    });
  }

}

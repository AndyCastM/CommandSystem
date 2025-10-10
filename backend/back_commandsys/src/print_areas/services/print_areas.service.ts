import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePrintAreaDto } from '../dto/create-print_area.dto';
import { UpdatePrintAreaDto } from '../dto/update-print_area.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class PrintAreasService {
  constructor(private readonly prisma: PrismaService) {}

  // Crea las default areas en todas las empresas
  async createDefaultAreas(id_company : number) {
    const defaultAreas = ['Cocina', 'Bar', 'Postres'];
    const created: string[] = [];

    for (const name of defaultAreas){
      const exists = await this.validateNamePrintArea(id_company, name);
      if (!exists){
        await this.prisma.print_areas.create({
          data: {id_company, name},
        });
        created.push(name);
      }
    }

    if (created.length === 0){
      return {message: "Lás areas por defecto ya existen para esta empresa"};
    }

    return formatResponse(
      "Áreas base creadas correctamente"
    );
  }

  async create(id_company: number, dto: CreatePrintAreaDto){
    const exists = await this.validateNamePrintArea(id_company, dto.name);
    if (!exists){
      await this.prisma.print_areas.create({
        data: {id_company, name: dto.name},
      });
    }

    return formatResponse(
      `Área ${dto.name} creada con éxito.`
    )
  }


  async findAll(id_company: number) {
    return this.prisma.print_areas.findMany({
      where: { id_company },
      orderBy: { id_area: 'asc' },
    });
  }

  async validateNamePrintArea(id_company: number, name: string){
    const printArea = await this.prisma.print_areas.findFirst({
      where: {
        id_company,
        name
      },
    });
    return !!printArea;
  }
}

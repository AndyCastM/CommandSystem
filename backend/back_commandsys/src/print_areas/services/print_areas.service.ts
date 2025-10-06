import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePrintAreaDto } from '../dto/create-print_area.dto';
import { UpdatePrintAreaDto } from '../dto/update-print_area.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PrintAreasService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPrintAreaDto: CreatePrintAreaDto) {
    return 'This action adds a new printArea';
  }

  findAll() {
    return `This action returns all printAreas`;
  }

  findOne(id: number) {
    return `This action returns a #${id} printArea`;
  }

  update(id: number, updatePrintAreaDto: UpdatePrintAreaDto) {
    return `This action updates a #${id} printArea`;
  }

  remove(id: number) {
    return `This action removes a #${id} printArea`;
  }

  async validateNamePrintArea(id_company: number, name: string){
    const printArea = await this.prisma.print_areas.findFirst({
      where: {
        //id_company,
        name
      }
    })
  }
}

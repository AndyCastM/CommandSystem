import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(id_company: number, dto: CreateBranchDto) {
    // Validar que la empresa existe
    const company = await this.prisma.companies.findUnique({
      where: { id_company: id_company },
    });
    if (!company) {
      throw new NotFoundException(`Empresa con id ${dto.id_company} no encontrada`);
    }

    // Validar que no se repita el nombre de sucursal en la misma ciudad
    const duplicate = await this.prisma.branches.findFirst({
      where: {
        id_company: id_company,
        name: dto.name,
        city: dto.city,
      },
    });
    if (duplicate) {
      throw new ConflictException(
        `Ya existe una sucursal "${dto.name}" en la ciudad ${dto.city}`,
      );
    }

    dto.id_company = id_company;
    // Si todo sale bien creamos la sucursal
    return this.prisma.branches.create({ data: dto });
  }

  async findAll(id_company: number, is_active?: number) {
    return this.prisma.branches.findMany({
      where: {
        id_company,
        ...(is_active !== undefined ? { is_active } : {}),
      },
    });
  }

  async findOne(id: number) {
    const branch = await this.prisma.branches.findUnique({ where: { id_branch: id } });
    if (!branch) throw new NotFoundException(`Sucursal con id ${id} no encontarda`);
    return branch;
  }

  async update(id: number, dto: UpdateBranchDto) {
    const branch = await this.prisma.branches.findUnique({ where: { id_branch: id } });
    if (!branch) {
      throw new NotFoundException(`Sucursal con id ${id} no encontrada`);
    }

    return this.prisma.branches.update({
      where: { id_branch: id },
      data: dto,
    });
  }


  async delete(id: number) {
    const branch = await this.prisma.branches.findUnique({ where: { id_branch: id } });
    if (!branch) {
      throw new NotFoundException(`Sucursal con id ${id} no encontrada`);
    }

    return this.prisma.branches.update({
      where: { id_branch: id },
      data: { is_active: 0 },
    });
  }

}

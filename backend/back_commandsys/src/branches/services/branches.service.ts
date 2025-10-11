import { Injectable, NotFoundException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto';
import { BranchSchedulesService } from 'src/branch_schedules/services/branch_schedules.service';
import { formatResponse } from 'src/common/helpers/response.helper';
import { CompanyProductsService } from 'src/company_products/services/company_products.service';

@Injectable()
export class BranchesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BranchSchedulesService))
    private readonly branchSchedulesService: BranchSchedulesService,
    private companyProductsService: CompanyProductsService,
  ) {}

  async create(id_company: number, dto: CreateBranchDto) {
    // Validaciones separadas
    await this.validateCompany(id_company);
    await this.validateDuplicateBranch(id_company, dto.name, dto.city);

    // Crear la sucursal
    const branch = await this.prisma.branches.create({
      data: { ...dto, id_company },
    });

    // Crear los 7 días default de horarios
    await this.branchSchedulesService.createDefaultWeek(branch.id_branch, branch.id_company);
    await this.companyProductsService.syncProductsToBranch(branch.id_company, branch.id_branch);
    return formatResponse(
      `Sucursal ${branch.name} creada correctamente.`,
      branch,
    );
  }

  async findAll(id_company: number, is_active?: number) {
    return this.prisma.branches.findMany({
      where: {
        id_company,
        ...(is_active !== undefined ? { is_active } : {}),
      },
    });
  }

  async findOne(id: number, id_company: number) {
    const branch = await this.prisma.branches.findUnique({
      where: { id_branch: id, id_company },
    });
    if (!branch) {
      throw new NotFoundException(
        `Sucursal con id ${id} no encontrada para la empresa ${id_company}`,
      );
    }
    return branch;
  }

  async update(id: number, id_company: number, dto: UpdateBranchDto) {
    await this.validateBranchInCompany(id, id_company);

    const branch = await this.prisma.branches.update({
      where: { id_branch: id },
      data: dto,
    });

    return formatResponse(
      `Sucursal ${branch.name} actualizada correctamente.`,
      branch,
    );
  }

  async delete(id: number, id_company: number) {
    await this.validateBranchInCompany(id, id_company);

    const branch = await this.prisma.branches.update({
      where: { id_branch: id },
      data: { is_active: 0 },
    });

    return formatResponse(
      `Sucursal ${branch.name} desactivada correctamente.`,
      branch,
    );
  }

  async activate(id: number, id_company: number) {
    await this.validateBranchInCompany(id, id_company);

    const branch = await this.prisma.branches.update({
      where: { id_branch: id },
      data: { is_active: 1 },
    });

   return formatResponse(
      `Sucursal ${branch.name} activada correctamente.`,
      branch,
    );
  }

  // Funciones de validación 
  private async validateCompany(id_company: number) {
    const company = await this.prisma.companies.findUnique({
      where: { id_company },
    });
    if (!company) {
      throw new NotFoundException(
        `Empresa con id ${id_company} no encontrada`,
      );
    }
    return true;
  }

  private async validateDuplicateBranch(id_company: number, name: string, city: string) {
    const duplicate = await this.prisma.branches.findFirst({
      where: { id_company, name, city },
    });
    if (duplicate) {
      throw new ConflictException(
        `Ya existe una sucursal ${name} en la ciudad ${city}`,
      );
    }
    return false;
  }

  async validateBranchInCompany(id_branch: number, id_company: number): Promise<boolean> {
    const branch = await this.prisma.branches.findFirst({
      where: { id_branch, id_company },
    });

    if (!branch) {
      throw new NotFoundException(
        `Sucursal con id ${id_branch} no encontrada para la empresa ${id_company}`,
      );
    }

    return true;
  }

}

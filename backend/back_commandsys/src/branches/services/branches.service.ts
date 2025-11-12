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
    return branch;
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
      include: {
        users: {
          where: { roles: { name: 'Gerente' } },
        },
      }
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

    return branch;
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

  async getBranchMenu(id_company: number, id_branch: number) {
    // Obtener productos activos de la sucursal, junto con sus relaciones e imágenes
    const products = await this.prisma.branch_products.findMany({
      where: {
        id_branch,
        is_active: true,
        company_products: {
          id_company: id_company,
        },
      },
      include: {
        company_products: {
          include: {
            product_categories: true, // Traer categorías de productos
            print_areas: true, // Traer áreas de impresión
            company_product_images: true,
            product_options: {
              include: {
                product_option_values: true,
                product_option_tiers: true,
              },
            },
          },
        },
      },
    });

    console.log('Productos cargados:', products.length);

    // Agrupar productos por área y dentro de cada área por categoría
    const grouped = products.reduce((acc, p) => {
      const prod = p.company_products;
      const area = prod.print_areas?.name || 'Sin Área'; // Área de impresión

      // Obtener primera imagen (o null)
      const firstImage = prod.company_product_images?.[0]?.image_url || null;

      if (!acc[area]) acc[area] = {};

      // Agrupar por categoría dentro del área
      const category = prod.product_categories?.name || 'Sin Categoría'; // Obtener categoría

      if (!acc[area][category]) acc[area][category] = [];

      acc[area][category].push({
        id_branch_product: p.id_branch_product,  // incluir el id_branch_product
        id: prod.id_company_product,
        name: prod.name,
        price: prod.base_price,
        description: prod.description,
        image: firstImage,
        options: prod.product_options.map((opt) => ({
          id_option: opt.id_option,
          name: opt.name,
          is_required: opt.is_required === 1,
          multi_select: opt.multi_select === 1,
          max_selection: opt.max_selection,
          values: opt.product_option_values.map((val) => ({
            id_value: val.id_option_value,
            name: val.name,
            extra_price: Number(val.extra_price),
            is_active: val.is_active,
          })),
          tiers: opt.product_option_tiers.map((tier) => ({
            id_tier: tier.id_tier,
            selection_count: tier.selection_count,
            extra_price: Number(tier.extra_price),
          })),
        })),
      });

      return acc;
    }, {} as Record<string, Record<string, any[]>>);

    // Convertir a formato de menú
    const menu = Object.entries(grouped).map(([area, categories]) => ({
      area,
      categories: Object.entries(categories).map(([category, products]) => ({
        category,
        products,
      })),
    }));

    // Respuesta final
    return {
      message: `Menú de la sucursal ${id_branch}`,
      data: menu,
    };
  }

}

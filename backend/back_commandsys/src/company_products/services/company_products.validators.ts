import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export class CompanyProductsValidators {
  constructor(private prisma: PrismaService) {}

  /**  Verifica que la empresa exista */
  async validateCompanyExists(id_company: number) {
    const company = await this.prisma.companies.findUnique({
      where: { id_company },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');
  }

  /** Verifica que el área de impresión exista */
  async validatePrintArea(id_area: number) {
    const area = await this.prisma.print_areas.findFirst({
      where: { id_area },
    });
    if (!area) throw new NotFoundException('Área de impresión no encontrada.');
  }

  /** Verifica que la categoría exista */
  async validateCategory(id_category: number, id_company: number) {
    const category = await this.prisma.product_categories.findFirst({
      where: { id_category, id_company },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada.');
  }

  /** Valida que no exista un producto duplicado en la empresa */
  async validateDuplicateProduct(name: string, id_category: number, id_company: number) {
    const existing = await this.prisma.company_products.findFirst({
      where: {
        id_company,
        id_category,
        name: name.trim(),
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Ya existe un producto llamado "${name}" en esta categoría.`
      );
    }
  }
}

import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyResponseDto } from '../dto/company-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { encrypt } from "src/libs/bcrypt";
import { PrintAreasService } from 'src/print_areas/services/print_areas.service';

@Injectable()
export class CompaniesService {

  constructor(private prisma: PrismaService, private printArea: PrintAreasService) {}
  
  async create(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    
    //Validar duplicados
    const existingCompany = await this.prisma.companies.findFirst({
      where: { rfc: dto.rfc },
    });
    if (existingCompany) {
      throw new ConflictException('Ya existe una empresa con este RFC');
    }

    const existingEmail = await this.prisma.companies.findFirst({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Ya existe una empresa con este correo electrónico');
    }

    const existingUser = await this.prisma.users.findFirst({
      where: { username: dto.admin_username },
    });
    if (existingUser) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    // Hashear la contraseña
    const hashedPassword = await encrypt(dto.admin_password);

    // Crear la empresa + usuario admin en una transacción

    const result = await this.prisma.$transaction(async (prisma) => {
      const company = await prisma.companies.create({
        data: {
          name: dto.name,
          legal_name: dto.legal_name,
          rfc: dto.rfc,
          street: dto.street,
          num_ext: dto.num_ext,
          colony: dto.colony,
          cp: dto.cp,
          city: dto.city,
          state: dto.state,
          phone: dto.phone,
          email: dto.email,
        },
      });

      // Crear el usuario admin asociado a la empresa
      const adminUser = await prisma.users.create({
        data: {
          id_company: company.id_company,
          id_role: 2, // Asignar rol de admin (2)
          name: dto.admin_name,
          last_name: dto.admin_last_name,
          last_name2: dto.admin_last_name2,
          username: dto.admin_username,
          password: hashedPassword,
        },
        include: { roles: true },
      });

      await this.printArea.createDefaultAreas(company.id_company);
      
      return { company, adminUser };
    });


    return {
      id_company: result.company.id_company,
      name: result.company.name,
      legal_name: result.company.legal_name,
      rfc: result.company.rfc,
      phone: result.company.phone,
      email: result.company.email,
      created_at: result.company.created_at,
      admin_user: {
        id_user: result.adminUser.id_user,
        username: result.adminUser.username,
        name: result.adminUser.name,
        last_name: result.adminUser.last_name,
        role: result.adminUser.roles.name,
      },
    };
  }

  async findAll() {
    return this.prisma.companies.findMany();
  }

  async findOne(id: number) {
    const company = await this.prisma.companies.findUnique({
      where: { id_company: id },
    });
    if (!company) {
      throw new BadRequestException('Empresa no encontrada');
    }
    return company;
  }

  async update(id:number, dto: UpdateCompanyDto){
    let data = { ...dto };

    const company = this.prisma.companies.update({
      where: { id_company: id },
      data,
    });
    return {
      message: 'Actualización exitosa',    
    };
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
  }
}

import { Controller, Post, Body, Get, Param, UseGuards, Patch } from '@nestjs/common';
import { CompaniesService } from '../services/companies.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(Role.Superadmin)
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  @Roles(Role.Superadmin)
  findAll() {
    return this.companiesService.findAll();
  }

  @Get('company')
  @Roles(Role.Superadmin, Role.Admin)
  findOne(@CurrentUser() user: any) {
    return this.companiesService.findOne(+user.id_company);
  }

  @Patch(':id')
  @Roles(Role.Superadmin, Role.Admin)
  update(@Param('id') id: number, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(+id, dto);
  }

}

import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PrintAreasService } from '../services/print_areas.service';
import { CreatePrintAreaDto } from '../dto/create-print_area.dto';
import { UpdatePrintAreaDto } from '../dto/update-print_area.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@Controller('print-areas')
export class PrintAreasController {
  constructor(private readonly printAreasService: PrintAreasService) {}

  @Post()
  @Roles(Role.Admin)
  create(
    @Body() createPrintAreaDto: CreatePrintAreaDto,
    @CurrentUser() user: any) {
     return this.printAreasService.create(user.id_company, createPrintAreaDto);
  }

  @Get()
  @Roles(Role.Admin, Role.Gerente, Role.Mesero)
  findAll(@CurrentUser() user: any){
    return this.printAreasService.findAll(user.id_company);
  }

}

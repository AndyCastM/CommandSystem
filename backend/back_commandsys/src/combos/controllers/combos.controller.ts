import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CombosService } from '../services/combos.service';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Get()
  @Roles(Role.Admin, Role.Gerente, Role.Mesero)
  async getAllCombos(
    @CurrentUser() user: any
  ) {
    return this.combosService.getAll(+user.id_company); 
  }
  
  @Post()
  @Roles(Role.Admin)
  async create(
    @CurrentUser() user: any,
    @Body() createComboDto: CreateComboDto
  ) {
    return this.combosService.create(+user.id_company, createComboDto);
  }
  
  @Get(':id')
  @Roles(Role.Admin, Role.Gerente, Role.Mesero)
  async getComboById(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.combosService.findOne(+id, +user.id_company);
  }

  @Patch(':id_combo/toggle')
  @Roles(Role.Admin)
  async toggleCombo(
    @Param('id_combo') id_combo: string,
    @CurrentUser() user: any
  ){
    return this.combosService.toggleActive(+id_combo, +user.id_company);
  }
}

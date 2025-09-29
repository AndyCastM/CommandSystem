import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { BranchesService } from '../services/branches.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(Role.Admin)
  async create(
    @CurrentUser() user: any,
    @Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(user.id_company, createBranchDto);
  }

  @Get()
  @Roles(Role.Admin)
  async findAll(
    @CurrentUser() user: any,
    @Query('is_active') isActive?: string
  ) {
    const filter = isActive === 'false' ? 0 : isActive === 'true' ? 1 : undefined;
    return this.branchesService.findAll(user.id_company, filter);
  }


  @Get(':id')
  @Roles(Role.Admin)
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(+id);
  }

  @Put(':id')
  @Roles(Role.Admin)
  update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchesService.update(+id, updateBranchDto);
  }

}



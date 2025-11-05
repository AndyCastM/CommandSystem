import { Controller, Post, Param, Body, Patch } from '@nestjs/common';
import { TableSessionsService } from '../services/table_sessions.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { OpenTableSessionDto } from '../dto/open-table_session.dto';

@Controller('table-sessions')
export class TableSessionsController {
  constructor(private readonly tableSessionsService: TableSessionsService) {}

  @Post('open/:id_table')
  @Roles(Role.Mesero, Role.Gerente)
  async openTable(
    @Param('id_table') id_table: string,
    @Body() dto: OpenTableSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.tableSessionsService.openTableSession(+id_table, user.id_user, dto.guests);
  }

  @Patch('close/:id_table')
  @Roles(Role.Mesero, Role.Gerente)
  async closeTable(
    @Param('id_table') id_table: string,
    @CurrentUser() user: any,
  ) {
    return this.tableSessionsService.closeTableSession(+id_table, user.id_user);
  }
}


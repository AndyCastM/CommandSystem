import { Controller, Post, Body, Req } from '@nestjs/common';
import { CashService } from '../services/cash.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@Controller('cash')
export class CashController {
  constructor(private cash: CashService) {}

  @Post('open')
  @Roles(Role.Cajero)
  async open( @CurrentUser() user: any, @Body() body) {
    return this.cash.openSession(+user.sub, +user.id_branch, body.opening_amount, body.notes);
  }


  @Post('close')
  @Roles(Role.Cajero)
  async close(@CurrentUser() user: any, @Body() body) {
    return this.cash.closeSession(+user.sub, +user.id_branch, body.counted_amount, body.notes);
  }

  @Post('active')
  async active(@CurrentUser() user: any) {
    return this.cash.getActiveSession(+user.sub, +user.id_branch);
  }
}

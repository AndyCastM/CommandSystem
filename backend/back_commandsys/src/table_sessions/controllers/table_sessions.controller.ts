import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TableSessionsService } from '../services/table_sessions.service';
import { CreateTableSessionDto } from '../dto/create-table_session.dto';
import { UpdateTableSessionDto } from '../dto/update-table_session.dto';

@Controller('table-sessions')
export class TableSessionsController {
  constructor(private readonly tableSessionsService: TableSessionsService) {}

  @Post()
  create(@Body() createTableSessionDto: CreateTableSessionDto) {
    return this.tableSessionsService.create(createTableSessionDto);
  }

  @Get()
  findAll() {
    return this.tableSessionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tableSessionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTableSessionDto: UpdateTableSessionDto) {
    return this.tableSessionsService.update(+id, updateTableSessionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tableSessionsService.remove(+id);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PrintAreasService } from './print_areas.service';
import { CreatePrintAreaDto } from './dto/create-print_area.dto';
import { UpdatePrintAreaDto } from './dto/update-print_area.dto';

@Controller('print-areas')
export class PrintAreasController {
  constructor(private readonly printAreasService: PrintAreasService) {}

  @Post()
  create(@Body() createPrintAreaDto: CreatePrintAreaDto) {
    return this.printAreasService.create(createPrintAreaDto);
  }

  @Get()
  findAll() {
    return this.printAreasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.printAreasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePrintAreaDto: UpdatePrintAreaDto) {
    return this.printAreasService.update(+id, updatePrintAreaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.printAreasService.remove(+id);
  }
}

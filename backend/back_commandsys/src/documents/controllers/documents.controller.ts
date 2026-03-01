import { Controller, Get, Param, Res } from '@nestjs/common';
import { DocumentsService } from '../services/documents.service';
import type { Response } from 'express';

@Controller('documents')
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Get('prebill/takeout/:id')
  generateTakeoutPrebill(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.service.generateTakeoutPrebill(Number(id), res);
  }

  @Get('prebill/table/:id')
  generateTablePrebill(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.service.generateTablePrebill(Number(id), res);
  }
}
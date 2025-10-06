import { PartialType } from '@nestjs/mapped-types';
import { CreatePrintAreaDto } from './create-print_area.dto';

export class UpdatePrintAreaDto extends PartialType(CreatePrintAreaDto) {}

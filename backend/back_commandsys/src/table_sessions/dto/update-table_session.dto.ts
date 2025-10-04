import { PartialType } from '@nestjs/mapped-types';
import { CreateTableSessionDto } from './create-table_session.dto';

export class UpdateTableSessionDto extends PartialType(CreateTableSessionDto) {}

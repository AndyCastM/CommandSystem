import { PartialType } from '@nestjs/mapped-types';
import { OpenTableSessionDto } from './open-table_session.dto';

export class UpdateTableSessionDto extends PartialType(OpenTableSessionDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { CreateTableLocationDto } from './create-table_location.dto';

export class UpdateTableLocationDto extends PartialType(CreateTableLocationDto) {
    static id_branch: number;
}

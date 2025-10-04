import { Injectable } from '@nestjs/common';
import { CreateTableSessionDto } from '../dto/create-table_session.dto';
import { UpdateTableSessionDto } from '../dto/update-table_session.dto';

@Injectable()
export class TableSessionsService {
  create(createTableSessionDto: CreateTableSessionDto) {
    return 'This action adds a new tableSession';
  }

  findAll() {
    return `This action returns all tableSessions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tableSession`;
  }

  update(id: number, updateTableSessionDto: UpdateTableSessionDto) {
    return `This action updates a #${id} tableSession`;
  }

  remove(id: number) {
    return `This action removes a #${id} tableSession`;
  }
}

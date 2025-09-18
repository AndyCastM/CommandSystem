import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBranchDto) {
    return this.prisma.branches.create({ data: dto });
  }

  async findAll() {
    return this.prisma.branches.findMany();
  }

  async findOne(id: number) {
    const branch = await this.prisma.branches.findUnique({ where: { id_branch: id } });
    if (!branch) throw new NotFoundException(`Branch with id ${id} not found`);
    return branch;
  }

  async update(id: number, dto: UpdateBranchDto) {
    return this.prisma.branches.update({
      where: { id_branch: id },
      data: dto,
    });
  }

  async remove(id: number) {
    return this.prisma.branches.delete({ where: { id_branch: id } });
  }
}

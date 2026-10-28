import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { throwPrismaError } from '../common/prisma-error.js';
import { CreateProblemTypeDto } from './dto/create-problem-type.dto.js';
import { UpdateProblemTypeDto } from './dto/update-problem-type.dto.js';

@Injectable()
export class ProblemTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProblemTypeDto) {
    try {
      return await this.prisma.problemType.create({ data: dto });
    } catch (error) {
      throwPrismaError(error);
    }
  }

  findAll() {
    return this.prisma.problemType.findMany({ orderBy: { name: 'asc' } });
  }

  findActive() {
    return this.prisma.problemType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const problemType = await this.prisma.problemType.findUnique({ where: { id } });
    if (!problemType) throw new NotFoundException('Tipo de problema não encontrado.');
    return problemType;
  }

  async update(id: string, dto: UpdateProblemTypeDto) {
    await this.findOne(id);
    try {
      return await this.prisma.problemType.update({ where: { id }, data: dto });
    } catch (error) {
      throwPrismaError(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    if (await this.prisma.ticket.count({ where: { problemTypeId: id } })) {
      throw new ConflictException(
        'Tipo de problema usado em chamados não pode ser removido; desative-o.',
      );
    }
    try {
      return await this.prisma.problemType.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Tipo de problema usado em chamados não pode ser removido; desative-o.',
        );
      }
      throwPrismaError(error);
    }
  }
}

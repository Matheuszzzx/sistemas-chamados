import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function throwPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException('Já existe um registro com esses dados únicos.');
    }
    if (error.code === 'P2003') {
      throw new ConflictException('O registro está sendo usado e não pode ser removido.');
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Registro não encontrado.');
    }
  }
  throw error;
}

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { throwPrismaError } from '../common/prisma-error.js';
import { CreatePersonDto } from './dto/create-person.dto.js';
import { UpdatePersonDto } from './dto/update-person.dto.js';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePersonDto) {
    try {
      return await this.prisma.person.create({
        data: {
          name: dto.name,
          email: dto.email,
          role: dto.role,
          passwordHash: await hash(dto.password, 12),
          version: 1.0,
          loginCount: 0,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          isAdmin: true,
          version: true,
          lastLogin: true,
          loginCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      throwPrismaError(error);
    }
  }

  findAll() {
    return this.prisma.person.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        isAdmin: true,
        version: true,
        lastLogin: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  findTechnicians() {
    return this.prisma.person.findMany({
      where: { role: 'TECHNICIAN', active: true },
      select: { id: true, name: true, role: true, version: true, loginCount: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        isAdmin: true,
        version: true,
        lastLogin: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!person) throw new NotFoundException('Pessoa não encontrada.');
    return person;
  }

  async update(id: string, dto: UpdatePersonDto, actorId: string) {
    if (id === actorId && dto.active === false) {
      throw new ForbiddenException('Não é possível desativar a própria conta.');
    }
    await this.findOne(id);
    try {
      const { password, version, ...data } = dto;
      return await this.prisma.person.update({
        where: { id },
        data: {
          ...data,
          ...(password ? { passwordHash: await hash(password, 12) } : {}),
          ...(version ? { version: parseFloat(version) } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          isAdmin: true,
          version: true,
          lastLogin: true,
          loginCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      throwPrismaError(error);
    }
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new ForbiddenException('Não é possível remover a própria conta.');
    }
    await this.findOne(id);
    const [requested, assigned, comments] = await Promise.all([
      this.prisma.ticket.count({ where: { requesterId: id } }),
      this.prisma.ticket.count({ where: { technicianId: id } }),
      this.prisma.comment.count({ where: { authorId: id } }),
    ]);
    if (requested + assigned + comments > 0) {
      throw new ConflictException(
        'Pessoa vinculada ao histórico de chamados não pode ser removida; desative-a.',
      );
    }
    try {
      return await this.prisma.person.delete({
        where: { id },
        select: { id: true, name: true, email: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Pessoa vinculada ao histórico de chamados não pode ser removida; desative-a.',
        );
      }
      throwPrismaError(error);
    }
  }
}

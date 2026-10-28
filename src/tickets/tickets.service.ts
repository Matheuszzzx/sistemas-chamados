import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PersonRole, TicketStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { throwPrismaError } from '../common/prisma-error.js';
import { AssignTicketDto } from './dto/assign-ticket.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';

const ticketDetails = {
  requester: { select: { id: true, name: true, email: true, role: true } },
  technician: { select: { id: true, name: true, email: true, role: true } },
  problemType: true,
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  },
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto, requesterId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM Person WHERE id = ${requesterId} FOR UPDATE
        `;
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM ProblemType WHERE id = ${dto.problemTypeId} FOR UPDATE
        `;
        const [requester, problemType] = await Promise.all([
          tx.person.findUnique({ where: { id: requesterId } }),
          tx.problemType.findUnique({ where: { id: dto.problemTypeId } }),
        ]);
        if (!requester) throw new NotFoundException('Solicitante não encontrado.');
        if (requester.role !== PersonRole.REQUESTER) {
          throw new BadRequestException('A pessoa informada não é solicitante.');
        }
        if (!requester.active) {
          throw new BadRequestException('Solicitante inativo não pode abrir chamados.');
        }
        if (!problemType) {
          throw new NotFoundException('Tipo de problema não encontrado.');
        }
        if (!problemType.active) {
          throw new BadRequestException(
            'Não é possível abrir chamado em um tipo de problema inativo.',
          );
        }
        return tx.ticket.create({
          data: {
            title: dto.title,
            description: dto.description,
            requesterId,
            problemTypeId: dto.problemTypeId,
            priority: dto.priority,
          },
          include: ticketDetails,
        });
      });
    } catch (error) {
      throwPrismaError(error);
    }
  }

  findAll(query: ListTicketsQueryDto, user: AuthUser) {
    return this.prisma.ticket.findMany({
      where: {
        ...(!user.isAdmin && user.role === PersonRole.REQUESTER
          ? { requesterId: user.id }
          : {}),
        status: query.status,
        priority: query.priority,
        problemTypeId: query.problemTypeId,
        technicianId: query.technicianId,
      },
      include: ticketDetails,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: ticketDetails,
    });
    if (!ticket) throw new NotFoundException('Chamado não encontrado.');
    if (
      !user.isAdmin &&
      user.role === PersonRole.REQUESTER &&
      ticket.requesterId !== user.id
    ) {
      throw new ForbiddenException('Você só pode consultar os seus próprios chamados.');
    }
    return ticket;
  }

  async assign(id: string, dto: AssignTicketDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM Ticket WHERE id = ${id} FOR UPDATE
        `;
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM Person WHERE id = ${dto.technicianId} FOR UPDATE
        `;
        const [ticket, technician] = await Promise.all([
          tx.ticket.findUnique({ where: { id } }),
          tx.person.findUnique({ where: { id: dto.technicianId } }),
        ]);
        if (!ticket) throw new NotFoundException('Chamado não encontrado.');
        if (!technician) throw new NotFoundException('Técnico não encontrado.');
        if (technician.role !== PersonRole.TECHNICIAN) {
          throw new BadRequestException('A pessoa informada não é técnica.');
        }
        if (!technician.active) {
          throw new BadRequestException('Técnico inativo não pode atender chamados.');
        }
        if (ticket.requesterId === technician.id) {
          throw new BadRequestException('Uma pessoa não pode atender o próprio chamado.');
        }
        if (
          ticket.status !== TicketStatus.OPEN &&
          ticket.status !== TicketStatus.IN_PROGRESS
        ) {
          throw new BadRequestException(
            'Só é possível designar técnico a chamados abertos ou em atendimento.',
          );
        }
        if (
          ticket.status === TicketStatus.IN_PROGRESS &&
          ticket.technicianId === technician.id
        ) {
          return tx.ticket.findUniqueOrThrow({
            where: { id },
            include: ticketDetails,
          });
        }
        const activeCount = await tx.ticket.count({
          where: {
            technicianId: technician.id,
            status: TicketStatus.IN_PROGRESS,
            id: { not: id },
          },
        });
        if (activeCount >= 5) {
          throw new BadRequestException(
            'Técnico já possui 5 chamados em atendimento.',
          );
        }
        return tx.ticket.update({
          where: { id },
          data: {
            technicianId: technician.id,
            status: TicketStatus.IN_PROGRESS,
          },
          include: ticketDetails,
        });
      });
    } catch (error) {
      throwPrismaError(error);
    }
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto, actorId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM Ticket WHERE id = ${id} FOR UPDATE
        `;
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM Person WHERE id = ${actorId} FOR UPDATE
        `;
        const [ticket, actor] = await Promise.all([
          tx.ticket.findUnique({ where: { id } }),
          tx.person.findUnique({ where: { id: actorId } }),
        ]);
        if (!ticket) throw new NotFoundException('Chamado não encontrado.');
        if (!actor) throw new NotFoundException('Pessoa responsável pela ação não encontrada.');
        if (!actor.active) {
          throw new ForbiddenException('Pessoa inativa não pode alterar chamados.');
        }
        if (ticket.status === TicketStatus.IN_PROGRESS) {
          if (
            actor.role !== PersonRole.TECHNICIAN ||
            ticket.technicianId !== actor.id
          ) {
            throw new ForbiddenException(
              'Somente o técnico responsável pode alterar o andamento do chamado.',
            );
          }
          if (
            dto.status !== TicketStatus.RESOLVED &&
            dto.status !== TicketStatus.CANCELED
          ) {
            throw new BadRequestException('Transição de situação inválida.');
          }
        } else if (ticket.status === TicketStatus.RESOLVED) {
          if (
            actor.role !== PersonRole.TECHNICIAN ||
            ticket.technicianId !== actor.id ||
            dto.status !== TicketStatus.CLOSED
          ) {
            throw new BadRequestException('Transição de situação inválida.');
          }
        } else if (ticket.status === TicketStatus.OPEN) {
          const requesterCancels =
            actor.role === PersonRole.REQUESTER &&
            actor.id === ticket.requesterId &&
            dto.status === TicketStatus.CANCELED;
          if (!requesterCancels) {
            throw new BadRequestException('Transição de situação inválida.');
          }
        } else {
          throw new BadRequestException(
            'Chamados fechados ou cancelados não podem ser alterados.',
          );
        }
        return tx.ticket.update({
          where: { id },
          data: {
            status: dto.status,
            resolvedAt:
              dto.status === TicketStatus.RESOLVED ? new Date() : undefined,
          },
          include: ticketDetails,
        });
      });
    } catch (error) {
      throwPrismaError(error);
    }
  }

  async addComment(id: string, dto: CreateCommentDto, authorId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM Ticket WHERE id = ${id} FOR UPDATE
        `;
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM Person WHERE id = ${authorId} FOR UPDATE
        `;
        const [ticket, author] = await Promise.all([
          tx.ticket.findUnique({ where: { id } }),
          tx.person.findUnique({ where: { id: authorId } }),
        ]);
        if (!ticket) throw new NotFoundException('Chamado não encontrado.');
        if (!author) throw new NotFoundException('Autor do comentário não encontrado.');
        if (
          ticket.status === TicketStatus.CLOSED ||
          ticket.status === TicketStatus.CANCELED
        ) {
          throw new BadRequestException(
            'Chamados fechados ou cancelados não podem receber comentários.',
          );
        }
        if (!author.active) {
          throw new ForbiddenException('Pessoa inativa não pode comentar.');
        }
        if (
          author.id !== ticket.requesterId &&
          author.id !== ticket.technicianId
        ) {
          throw new ForbiddenException(
            'Somente o solicitante e o técnico responsável podem comentar.',
          );
        }
        return tx.comment.create({
          data: { ticketId: id, authorId: author.id, content: dto.content },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        });
      });
    } catch (error) {
      throwPrismaError(error);
    }
  }
}

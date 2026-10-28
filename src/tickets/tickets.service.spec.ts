import { BadRequestException } from '@nestjs/common';
import { PersonRole, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { TicketsService } from './tickets.service.js';

describe('TicketsService', () => {
  it('does not open a ticket for an inactive requester', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      person: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'requester-1',
          role: PersonRole.REQUESTER,
          active: false,
        }),
      },
      problemType: {
        findUnique: vi.fn().mockResolvedValue({ id: 'type-1', active: true }),
      },
      ticket: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: never) => Promise<unknown>) =>
        callback(tx as never),
      ),
    } as unknown as PrismaService;
    const service = new TicketsService(prisma);

    await expect(
      service.create({
        title: 'Falha na rede',
        description: 'Não consigo acessar a rede interna.',
        requesterId: 'requester-1',
        problemTypeId: 'type-1',
        priority: TicketPriority.MEDIUM,
      }, 'requester-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.ticket.create).not.toHaveBeenCalled();
  });

  it('starts service automatically when assigning a technician', async () => {
    const updatedTicket = { id: 'ticket-1', status: TicketStatus.IN_PROGRESS };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      ticket: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'ticket-1',
          requesterId: 'requester-1',
          technicianId: null,
          status: TicketStatus.OPEN,
        }),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn().mockResolvedValue(updatedTicket),
      },
      person: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'technician-1',
          role: PersonRole.TECHNICIAN,
          active: true,
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: never) => Promise<unknown>) =>
        callback(tx as never),
      ),
    } as unknown as PrismaService;
    const service = new TicketsService(prisma);

    await expect(
      service.assign('ticket-1', { technicianId: 'technician-1' }),
    ).resolves.toEqual(updatedTicket);
    expect(tx.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ticket-1' },
        data: {
          technicianId: 'technician-1',
          status: TicketStatus.IN_PROGRESS,
        },
      }),
    );
  });

  it('rejects assignments when a technician already has five active tickets', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      ticket: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'ticket-1',
          requesterId: 'requester-1',
          technicianId: null,
          status: TicketStatus.OPEN,
        }),
        count: vi.fn().mockResolvedValue(5),
        update: vi.fn(),
      },
      person: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'technician-1',
          role: PersonRole.TECHNICIAN,
          active: true,
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: never) => Promise<unknown>) =>
        callback(tx as never),
      ),
    } as unknown as PrismaService;
    const service = new TicketsService(prisma);

    await expect(
      service.assign('ticket-1', { technicianId: 'technician-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.ticket.update).not.toHaveBeenCalled();
  });
});

import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PersonRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  it('returns a signed token and safe user data for a valid login', async () => {
    const passwordHash = await hash('senha-segura-123', 4);
    const person = {
      id: 'person-1',
      name: 'Pessoa Teste',
      email: 'pessoa@empresa.com',
      role: PersonRole.REQUESTER,
      isAdmin: false,
      active: true,
      passwordHash,
    };
    const prisma = {
      person: { findUnique: vi.fn().mockResolvedValue(person) },
    } as unknown as PrismaService;
    const jwt = { signAsync: vi.fn().mockResolvedValue('signed-token') };
    const service = new AuthService(prisma, jwt as never);

    await expect(
      service.login({ email: person.email, password: 'senha-segura-123' }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: {
        id: person.id,
        name: person.name,
        email: person.email,
        role: PersonRole.REQUESTER,
        isAdmin: false,
      },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: person.id });
  });

  it('rejects invalid credentials without disclosing whether the email exists', async () => {
    const prisma = {
      person: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const jwt = { signAsync: vi.fn() };
    const service = new AuthService(prisma, jwt as never);

    await expect(
      service.login({ email: 'nao-existe@empresa.com', password: 'senha-errada' }),
    ).rejects.toThrow(new UnauthorizedException('E-mail ou senha inválidos.'));
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects inactive accounts even when their password is correct', async () => {
    const passwordHash = await hash('senha-segura-123', 4);
    const prisma = {
      person: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'person-1',
          active: false,
          passwordHash,
        }),
      },
    } as unknown as PrismaService;
    const jwt = { signAsync: vi.fn() };
    const service = new AuthService(prisma, jwt as never);

    await expect(
      service.login({ email: 'pessoa@empresa.com', password: 'senha-segura-123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PersonRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { ADMIN_ONLY_KEY, ROLES_KEY } from './auth.decorator.js';
import { AccessGuard } from './access.guard.js';

function createContext(user: {
  id: string;
  role: PersonRole;
  isAdmin: boolean;
}): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const handler = () => undefined;

describe('AccessGuard', () => {
  it('rejects requesters from technician-only actions', () => {
    Reflect.defineMetadata(ROLES_KEY, [PersonRole.TECHNICIAN], handler);
    const guard = new AccessGuard(new Reflector());

    expect(() =>
      guard.canActivate(
        createContext({
          id: 'requester-1',
          role: PersonRole.REQUESTER,
          isAdmin: false,
        }),
      ),
    ).toThrow(new ForbiddenException('Seu perfil não pode executar esta ação.'));
    Reflect.deleteMetadata(ROLES_KEY, handler);
  });

  it('allows administrators through admin-only actions', () => {
    Reflect.defineMetadata(ADMIN_ONLY_KEY, true, handler);
    const guard = new AccessGuard(new Reflector());

    expect(
      guard.canActivate(
        createContext({
          id: 'admin-1',
          role: PersonRole.TECHNICIAN,
          isAdmin: true,
        }),
      ),
    ).toBe(true);
    Reflect.deleteMetadata(ADMIN_ONLY_KEY, handler);
  });
});

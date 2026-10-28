import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ADMIN_ONLY_KEY,
  ROLES_KEY,
} from './auth.decorator.js';
import type { AuthUser } from './auth-user.js';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user) return true;
    const adminOnly = this.reflector.getAllAndOverride<boolean>(
      ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (adminOnly && !user.isAdmin) {
      throw new ForbiddenException('Apenas administradores podem executar esta ação.');
    }

    const roles = this.reflector.getAllAndOverride<AuthUser['role'][]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (roles?.length && !roles.includes(user.role)) {
      throw new ForbiddenException('Seu perfil não pode executar esta ação.');
    }
    return true;
  }
}

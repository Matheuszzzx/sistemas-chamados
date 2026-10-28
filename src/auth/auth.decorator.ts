import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PersonRole } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from './auth-user.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const ADMIN_ONLY_KEY = 'adminOnly';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: PersonRole[]) => SetMetadata(ROLES_KEY, roles);
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<Request>().user,
);

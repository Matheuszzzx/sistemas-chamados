import type { PersonRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: PersonRole;
  isAdmin: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}

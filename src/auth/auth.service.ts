import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const person = await this.prisma.person.findUnique({
      where: { email: dto.email },
    });
    if (
      !person ||
      !person.active ||
      !person.passwordHash ||
      !(await compare(dto.password, person.passwordHash))
    ) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const accessToken = await this.jwt.signAsync({ sub: person.id });
    return {
      accessToken,
      user: {
        id: person.id,
        name: person.name,
        email: person.email,
        role: person.role,
        isAdmin: person.isAdmin,
      },
    };
  }
}

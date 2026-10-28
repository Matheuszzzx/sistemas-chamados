import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PeopleModule } from './people/people.module.js';
import { ProblemTypesModule } from './problem-types/problem-types.module.js';
import { TicketsModule } from './tickets/tickets.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PeopleModule,
    ProblemTypesModule,
    TicketsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

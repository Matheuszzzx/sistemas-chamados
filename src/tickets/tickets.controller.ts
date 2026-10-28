import {
  Body,
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/auth.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { PersonRole } from '@prisma/client';
import { AssignTicketDto } from './dto/assign-ticket.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import { TicketsService } from './tickets.service.js';

@ApiTags('chamados')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Abre um chamado' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser) {
    if (!user.isAdmin && user.role !== PersonRole.REQUESTER) {
      throw new ForbiddenException('Somente solicitantes podem abrir chamados.');
    }
    if (!user.isAdmin && dto.requesterId !== undefined) {
      throw new BadRequestException(
        'O solicitante do chamado é definido pela conta autenticada.',
      );
    }
    const requesterId = user.isAdmin ? dto.requesterId : user.id;
    if (!requesterId) {
      throw new BadRequestException('Selecione o solicitante do chamado.');
    }
    return this.ticketsService.create(dto, requesterId);
  }

  @Get()
  @ApiOperation({ summary: 'Lista chamados com filtros opcionais' })
  findAll(@Query() query: ListTicketsQueryDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta chamado e histórico de comentários' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ticketsService.findOne(id, user);
  }

  @Post(':id/assignment')
  @Roles(PersonRole.TECHNICIAN)
  @ApiOperation({ summary: 'Designa ou reatribui um técnico' })
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.ticketsService.assign(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Avança ou cancela o chamado conforme as transições permitidas' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketsService.updateStatus(id, dto, user.id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Adiciona comentário imutável ao histórico' })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketsService.addComment(id, dto, user.id);
  }
}

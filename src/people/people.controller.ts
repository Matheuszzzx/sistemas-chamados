import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly, CurrentUser } from '../auth/auth.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CreatePersonDto } from './dto/create-person.dto.js';
import { UpdatePersonDto } from './dto/update-person.dto.js';
import { PeopleService } from './people.service.js';

@ApiTags('pessoas')
@ApiBearerAuth()
@Controller('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Cadastra uma pessoa solicitante ou técnica' })
  create(@Body() dto: CreatePersonDto) {
    return this.peopleService.create(dto);
  }

  @Get()
  @AdminOnly()
  findAll() {
    return this.peopleService.findAll();
  }

  @Get('technicians')
  findTechnicians() {
    return this.peopleService.findTechnicians();
  }

  @Get(':id')
  @AdminOnly()
  findOne(@Param('id') id: string) {
    return this.peopleService.findOne(id);
  }

  @Patch(':id')
  @AdminOnly()
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.peopleService.update(id, dto, user.id);
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Remove pessoa sem histórico de chamados' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.peopleService.remove(id, user.id);
  }
}

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
import { AdminOnly } from '../auth/auth.decorator.js';
import { CreateProblemTypeDto } from './dto/create-problem-type.dto.js';
import { UpdateProblemTypeDto } from './dto/update-problem-type.dto.js';
import { ProblemTypesService } from './problem-types.service.js';

@ApiTags('tipos de problema')
@ApiBearerAuth()
@Controller('problem-types')
export class ProblemTypesController {
  constructor(private readonly problemTypesService: ProblemTypesService) {}

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateProblemTypeDto) {
    return this.problemTypesService.create(dto);
  }

  @Get()
  @AdminOnly()
  findAll() {
    return this.problemTypesService.findAll();
  }

  @Get('active')
  findActive() {
    return this.problemTypesService.findActive();
  }

  @Get(':id')
  @AdminOnly()
  findOne(@Param('id') id: string) {
    return this.problemTypesService.findOne(id);
  }

  @Patch(':id')
  @AdminOnly()
  update(@Param('id') id: string, @Body() dto: UpdateProblemTypeDto) {
    return this.problemTypesService.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Remove tipo de problema sem chamados vinculados' })
  remove(@Param('id') id: string) {
    return this.problemTypesService.remove(id);
  }
}

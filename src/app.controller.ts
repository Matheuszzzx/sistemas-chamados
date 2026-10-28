import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/auth.decorator.js';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Verifica se a API está disponível' })
  health() {
    return { status: 'ok' };
  }
}

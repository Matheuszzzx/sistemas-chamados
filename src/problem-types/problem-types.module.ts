import { Module } from '@nestjs/common';
import { ProblemTypesController } from './problem-types.controller.js';
import { ProblemTypesService } from './problem-types.service.js';

@Module({
  controllers: [ProblemTypesController],
  providers: [ProblemTypesService],
})
export class ProblemTypesModule {}

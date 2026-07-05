import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService] // exportado para que otros módulos puedan inyectarlo
})
export class AiModule {}

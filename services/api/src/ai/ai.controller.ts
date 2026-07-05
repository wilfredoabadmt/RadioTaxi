import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateContentDto } from './dto/generate-content.dto';
import { DispatchSuggestionDto } from './dto/dispatch-suggestion.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // Generación libre de contenido con Gemini.
  // Restringido a ADMIN/DISPATCHER: genera costo por llamada.
  @Roles('ADMIN', 'DISPATCHER')
  @Post('generate')
  generate(@Body() data: GenerateContentDto) {
    return this.aiService.generateContent(data.prompt, {
      temperature: data.temperature,
      maxOutputTokens: data.maxOutputTokens
    });
  }

  // Despacho asistido: sugiere el mejor vehículo para una solicitud de viaje.
  @Roles('ADMIN', 'DISPATCHER')
  @Post('dispatch/suggest')
  suggestDispatch(@Body() data: DispatchSuggestionDto) {
    return this.aiService.suggestDispatch(data.tripRequest, data.vehicles);
  }
}

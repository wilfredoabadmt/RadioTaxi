import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { GenerateContentDto } from './dto/generate-content.dto';
import { DispatchSuggestionDto } from './dto/dispatch-suggestion.dto';
import { Roles } from '../auth/roles.decorator';

@ApiTags('ai')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Roles('ADMIN', 'DISPATCHER')
  @Post('generate')
  @ApiOperation({ summary: 'Generación libre con Google Gemini para soporte o despachos' })
  @ApiResponse({ status: 200, description: 'Contenido generado exitosamente' })
  generate(@Body() data: GenerateContentDto) {
    return this.aiService.generateContent(data.prompt, {
      temperature: data.temperature,
      maxOutputTokens: data.maxOutputTokens,
    });
  }

  @Roles('ADMIN', 'DISPATCHER')
  @Post('dispatch/suggest')
  @ApiOperation({
    summary: 'Despacho inteligente asistido por IA: evalúa vehículos disponibles y sugiere el más óptimo',
    description: 'Utiliza Google Gemini con degradación elegante a distancia Haversine si el servicio de IA no está disponible.',
  })
  @ApiResponse({ status: 200, description: 'Vehículo recomendado, ranking y motivo' })
  suggestDispatch(@Body() data: DispatchSuggestionDto) {
    return this.aiService.suggestDispatch(data.tripRequest, data.vehicles);
  }
}

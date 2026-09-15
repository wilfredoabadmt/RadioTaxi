import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../auth/public.decorator';

@ApiTags('observability')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Verificar estado de salud del API, base de datos y memoria' })
  @ApiResponse({ status: 200, description: 'Estado de salud del sistema' })
  checkHealth() {
    return this.healthService.checkHealth();
  }

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Exportar métricas de observabilidad en formato estándar Prometheus' })
  @ApiResponse({ status: 200, description: 'Métricas de Prometheus en texto plano' })
  getMetrics() {
    return this.healthService.getPrometheusMetrics();
  }
}

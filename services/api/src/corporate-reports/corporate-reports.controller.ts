import { Body, Controller, Get, Param, ParseIntPipe, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { CorporateReportsService } from './corporate-reports.service';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class CorporateReportsController {
  constructor(private service: CorporateReportsService) {}

  @Post(':companyId')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('GENERATE', 'CorporateReport')
  @ApiOperation({ summary: 'Generar reporte consolidado de viajes y exportar a Excel' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa cliente o radiotaxi' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Reporte Quincenal Septiembre' },
        periodStart: { type: 'string', example: '2026-09-01T00:00:00Z' },
        periodEnd: { type: 'string', example: '2026-09-15T23:59:59Z' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Reporte generado con métricas y Excel binario' })
  generate(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() body?: { title?: string; periodStart?: string; periodEnd?: string },
  ) {
    return this.service.generateReport(
      companyId,
      body?.title,
      body?.periodStart,
      body?.periodEnd,
    );
  }

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Listar reportes generados' })
  @ApiResponse({ status: 200, description: 'Historial de reportes' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id/download')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Descargar archivo Excel (.xlsx) oficial del reporte' })
  @ApiParam({ name: 'id', description: 'ID del reporte' })
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { buffer, filename } = await this.service.getExcelBuffer(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
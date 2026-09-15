import { Injectable, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CorporateReportsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.corporateReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: { company: true },
    });
  }

  async findOne(id: number) {
    const report = await this.prisma.corporateReport.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!report) {
      throw new NotFoundException(`Reporte #${id} no encontrado`);
    }
    return report;
  }

  async generateReport(
    companyId: number,
    title = 'Reporte Ejecutivo y Operativo',
    periodStart?: string,
    periodEnd?: string,
  ) {
    const startDate = periodStart ? new Date(periodStart) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const endDate = periodEnd ? new Date(periodEnd) : new Date();

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    const trips = await this.prisma.trip.findMany({
      where: {
        tripRequest: { companyId },
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        tripRequest: {
          include: { customer: true },
        },
        driver: {
          include: { user: true },
        },
        vehicle: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    const totalTrips = trips.length;
    const completedTrips = trips.filter((t: any) => t.status === 'COMPLETED').length;
    const cancelledTrips = trips.filter((t: any) => t.status === 'CANCELLED').length;
    const totalRevenue = trips
      .filter((t: any) => t.status === 'COMPLETED')
      .reduce((sum: number, t: any) => sum + (Number(t.fareTotal) || 0), 0);
    const totalDistanceMeters = trips.reduce(
      (sum: number, t: any) => sum + (Number(t.distanceMeters) || 0),
      0,
    );
    const totalDistanceKm = Number((totalDistanceMeters / 1000).toFixed(2));

    // Generar archivo Excel real con XLSX
    const summaryData = [
      ['EMPRESA OPERADORA', company?.name || 'RadioTaxi Bolivia SRL'],
      ['NIT', company?.nit || '348921028'],
      ['TÍTULO DEL REPORTE', title],
      ['FECHA GENERACIÓN', new Date().toISOString()],
      ['PERIODO DESDE', startDate.toISOString()],
      ['PERIODO HASTA', endDate.toISOString()],
      [],
      ['MÉTRICA', 'VALOR'],
      ['Total Carreras Registradas', totalTrips],
      ['Carreras Completadas', completedTrips],
      ['Carreras Canceladas', cancelledTrips],
      ['Facturación Total (BOB)', `Bs ${totalRevenue.toFixed(2)}`],
      ['Distancia Acumulada (Km)', `${totalDistanceKm} km`],
    ];

    const tripsRows = trips.map((t: any) => ({
      ID: t.id,
      Fecha: t.startedAt ? new Date(t.startedAt).toISOString() : '',
      Estado: t.status,
      Conductor: t.driver?.user?.name || 'N/A',
      Placa: t.vehicle?.plate || 'N/A',
      Pasajero: t.tripRequest?.customer?.name || 'General',
      Origen: t.tripRequest?.originAddress || '',
      Destino: t.tripRequest?.destinationAddress || '',
      Distancia_Km: t.distanceMeters ? (t.distanceMeters / 1000).toFixed(2) : '0.00',
      Tarifa_BOB: t.fareTotal ? Number(t.fareTotal).toFixed(2) : '0.00',
      Metodo_Pago: t.paymentMethod || 'cash',
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const wsTrips = XLSX.utils.json_to_sheet(tripsRows);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
    XLSX.utils.book_append_sheet(wb, wsTrips, 'Detalle de Viajes');

    const excelBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    return this.prisma.corporateReport.create({
      data: {
        companyId,
        title,
        reportType: 'CONSOLIDATED_EXCEL',
        periodStart: startDate,
        periodEnd: endDate,
        fileUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBase64.slice(0, 100)}...`,
        data: {
          totalTrips,
          completedTrips,
          cancelledTrips,
          totalRevenue,
          totalDistanceKm,
          excelBase64,
        },
      },
    });
  }

  async getExcelBuffer(id: number) {
    const report = await this.findOne(id);
    const reportData: any = report.data;

    if (!reportData?.excelBase64) {
      throw new NotFoundException('El reporte no contiene archivo Excel binario');
    }

    const buffer = Buffer.from(reportData.excelBase64, 'base64');
    const filename = `reporte-${report.id}-${report.title.replace(/\s+/g, '_')}.xlsx`;

    return { buffer, filename };
  }
}
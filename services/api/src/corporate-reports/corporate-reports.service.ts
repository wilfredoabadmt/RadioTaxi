import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CorporateReportsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.corporateReport.findMany({
      orderBy: {
        createdAt: 'desc' // ✅ corregido
      },
      include: {
        company: true
      }
    });
  }

  async generateReport(companyId: number) {
    const trips = await this.prisma.trip.findMany({
      where: {
        tripRequest: {
          companyId: companyId // ✅ correcto
        }
      },
      include: {
        tripRequest: true,
        driver: true,
        vehicle: true
      }
    });

    const totalTrips = trips.length;

    const totalRevenue = trips.reduce(
      (sum, t) => sum + (t.fareTotal || 0),
      0
    );

    return this.prisma.corporateReport.create({
      data: {
        companyId,
        title: 'Reporte General',
        reportType: 'SUMMARY', // ✅ correcto
        data: {
          totalTrips,
          totalRevenue
        }
      }
    });
  }
}
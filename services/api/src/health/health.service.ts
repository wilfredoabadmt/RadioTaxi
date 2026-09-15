import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth() {
    let dbStatus = 'DOWN';
    let dbLatencyMs = 0;

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
      dbStatus = 'UP';
    } catch (err: any) {
      this.logger.error('Health check failed database ping:', err.message);
    }

    const memoryUsage = process.memoryUsage();

    return {
      status: dbStatus === 'UP' ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      system: {
        nodeVersion: process.version,
        memory: {
          heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        },
      },
      services: {
        realtime: { status: 'CONFIGURED', port: 3002 },
        telephony: { status: 'CONFIGURED', port: 3003 },
        asterisk: { status: 'CONFIGURED', port: 5060 },
      },
    };
  }

  async getPrometheusMetrics() {
    let dbConnected = 0;
    let activeDrivers = 0;
    let activeTrips = 0;
    let totalCompleted = 0;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbConnected = 1;

      const [drivers, trips, completed] = await Promise.all([
        this.prisma.driver.count({ where: { status: 'available' } }),
        this.prisma.trip.count({ where: { status: { in: ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'] } } }),
        this.prisma.trip.count({ where: { status: 'COMPLETED' } }),
      ]);

      activeDrivers = drivers;
      activeTrips = trips;
      totalCompleted = completed;
    } catch (err) {
      dbConnected = 0;
    }

    const mem = process.memoryUsage();
    const uptime = Math.floor(process.uptime());

    return [
      '# HELP radiotaxi_uptime_seconds Proceso de API activo en segundos',
      '# TYPE radiotaxi_uptime_seconds counter',
      `radiotaxi_uptime_seconds ${uptime}`,
      '',
      '# HELP radiotaxi_db_connected Estado de conexión PostgreSQL (1=UP, 0=DOWN)',
      '# TYPE radiotaxi_db_connected gauge',
      `radiotaxi_db_connected ${dbConnected}`,
      '',
      '# HELP radiotaxi_memory_heap_used_bytes Memoria Heap usada',
      '# TYPE radiotaxi_memory_heap_used_bytes gauge',
      `radiotaxi_memory_heap_used_bytes ${mem.heapUsed}`,
      '',
      '# HELP radiotaxi_active_drivers_total Conductores disponibles para despacho',
      '# TYPE radiotaxi_active_drivers_total gauge',
      `radiotaxi_active_drivers_total ${activeDrivers}`,
      '',
      '# HELP radiotaxi_active_trips_total Viajes actualmente en curso o asignados',
      '# TYPE radiotaxi_active_trips_total gauge',
      `radiotaxi_active_trips_total ${activeTrips}`,
      '',
      '# HELP radiotaxi_completed_trips_total Total de viajes completados históricamente',
      '# TYPE radiotaxi_completed_trips_total counter',
      `radiotaxi_completed_trips_total ${totalCompleted}`,
    ].join('\n');
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Successfully connected to PostgreSQL database');
    } catch (error) {
      console.error('CRITICAL WARNING: Could not connect to database on startup. Check DATABASE_URL.');
      console.error(error);
      // We don't rethrow to avoid crashing the entire application context
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

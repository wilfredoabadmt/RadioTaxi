import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        console.log('✅ [Prisma] Conexión establecida con la base de datos');
        return;
      } catch (err: any) {
        retries--;
        console.warn(`⚠️ [Prisma] Intento de conexión fallido (${5 - retries}/5): ${err?.message || err}`);
        if (retries > 0) {
          await new Promise((res) => setTimeout(res, 3000));
        } else {
          console.error('❌ [Prisma] No se pudo conectar a la base de datos en el arranque. La API permanecerá viva para healthchecks.');
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

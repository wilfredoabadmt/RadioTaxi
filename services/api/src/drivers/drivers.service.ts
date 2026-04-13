import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.driver.findMany({
      include: { 
        vehicle: true 
      }
    });
  }

  async findOne(id: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: { 
        vehicle: true 
      }
    });

    if (!driver) {
      throw new NotFoundException(`Conductor con ID ${id} no encontrado`);
    }

    return driver;
  }
}

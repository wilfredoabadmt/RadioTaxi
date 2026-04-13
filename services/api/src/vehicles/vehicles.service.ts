import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.vehicle.findMany({
      include: { 
        driver: true 
      }
    });
  }

  async findOne(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { 
        driver: true 
      }
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehículo con ID ${id} no encontrado`);
    }

    return vehicle;
  }
}

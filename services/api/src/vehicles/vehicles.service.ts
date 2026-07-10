import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

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

  async create(data: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { plate: data.plate }
    });
    if (existing) {
      throw new ConflictException(`Ya existe un vehículo con placa "${data.plate}"`);
    }

    return this.prisma.vehicle.create({
      data,
      include: { driver: true }
    });
  }

  async update(id: number, data: UpdateVehicleDto) {
    await this.findOne(id); // 404 si no existe

    if (data.plate) {
      const clash = await this.prisma.vehicle.findUnique({
        where: { plate: data.plate }
      });
      if (clash && clash.id !== id) {
        throw new ConflictException(`Ya existe un vehículo con placa "${data.plate}"`);
      }
    }

    return this.prisma.vehicle.update({
      where: { id },
      data,
      include: { driver: true }
    });
  }

  async remove(id: number) {
    await this.findOne(id); // 404 si no existe

    const tripCount = await this.prisma.trip.count({ where: { vehicleId: id } });
    if (tripCount > 0) {
      throw new ConflictException(
        'No se puede eliminar un vehículo con viajes asociados; desactívalo (status="offline") en su lugar.'
      );
    }

    return this.prisma.vehicle.delete({ where: { id } });
  }
}

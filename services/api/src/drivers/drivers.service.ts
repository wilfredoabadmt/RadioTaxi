import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.driver.findMany({
      include: {
        user: true,
        vehicle: true
      }
    });
  }

  async findOne(id: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        vehicle: true
      }
    });

    if (!driver) {
      throw new NotFoundException(`Conductor con ID ${id} no encontrado`);
    }

    return driver;
  }

  // Crea la cuenta (User role=DRIVER) y el perfil Driver en una transacción.
  async create(data: CreateDriverDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          phone: data.phone,
          role: 'DRIVER',
          companyId: data.companyId
        }
      });

      return tx.driver.create({
        data: {
          userId: user.id,
          licenseNumber: data.licenseNumber,
          licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
          experienceYears: data.experienceYears
        },
        include: { user: true, vehicle: true }
      });
    });
  }

  async update(id: number, data: UpdateDriverDto) {
    const driver = await this.findOne(id); // 404 si no existe

    // Campos que viven en User vs Driver.
    const userData: any = {};
    if (data.name !== undefined) userData.name = data.name;
    if (data.phone !== undefined) userData.phone = data.phone;

    const driverData: any = {};
    if (data.licenseNumber !== undefined) driverData.licenseNumber = data.licenseNumber;
    if (data.licenseExpiry !== undefined) {
      driverData.licenseExpiry = data.licenseExpiry ? new Date(data.licenseExpiry) : null;
    }
    if (data.experienceYears !== undefined) driverData.experienceYears = data.experienceYears;
    if (data.status !== undefined) driverData.status = data.status;

    return this.prisma.$transaction(async (tx: any) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: driver.userId }, data: userData });
      }
      return tx.driver.update({
        where: { id },
        data: driverData,
        include: { user: true, vehicle: true }
      });
    });
  }

  async remove(id: number) {
    const driver = await this.findOne(id); // 404 si no existe

    const tripCount = await this.prisma.trip.count({ where: { driverId: id } });
    if (tripCount > 0) {
      throw new ConflictException(
        'No se puede eliminar un conductor con viajes asociados; desactiva su cuenta o ponlo "offline".'
      );
    }

    // Elimina el perfil Driver y desactiva la cuenta de usuario (soft delete del User).
    return this.prisma.$transaction(async (tx: any) => {
      await tx.vehicle.updateMany({
        where: { driverId: id },
        data: { driverId: null }
      });
      const deleted = await tx.driver.delete({ where: { id } });
      await tx.user.update({
        where: { id: driver.userId },
        data: { status: 'inactive' }
      });
      return deleted;
    });
  }

  /**
   * Actualiza la posición GPS del conductor y sus vehículos asociados (Fase 2.7).
   */
  async updateLocation(id: number, data: { lat: number; lng: number; status?: string }) {
    await this.findOne(id); // 404 si no existe

    return this.prisma.$transaction(async (tx: any) => {
      const updatedDriver = await tx.driver.update({
        where: { id },
        data: {
          currentLat: data.lat,
          currentLng: data.lng,
          ...(data.status ? { status: data.status } : {}),
        },
        include: { user: true, vehicle: true },
      });

      // Sincronizar posición con los vehículos asignados al conductor
      await tx.vehicle.updateMany({
        where: { driverId: id },
        data: {
          currentLat: data.lat,
          currentLng: data.lng,
          ...(data.status ? { status: data.status } : {}),
        },
      });

      return updatedDriver;
    });
  }

  // ===========================================================================
  // Gestión de Documentación de Choferes (DriverDocument)
  // ===========================================================================

  async addDocument(driverId: number, dto: any) {
    await this.findOne(driverId);
    return this.prisma.driverDocument.create({
      data: {
        driverId,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        fileUrl: dto.fileUrl ?? null,
        verified: false,
      },
    });
  }

  async findDocuments(driverId: number) {
    await this.findOne(driverId);
    return this.prisma.driverDocument.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyDocument(driverId: number, docId: number) {
    await this.findOne(driverId);
    const doc = await this.prisma.driverDocument.findFirst({
      where: { id: docId, driverId },
    });
    if (!doc) {
      throw new NotFoundException(`Documento #${docId} no encontrado para este conductor`);
    }

    return this.prisma.driverDocument.update({
      where: { id: docId },
      data: { verified: true },
    });
  }

  // ===========================================================================
  // Cumplimiento Regulatorio Boliviano (ComplianceRecord: TIC, CUDAP, NIT)
  // ===========================================================================

  async addCompliance(driverId: number, dto: any) {
    await this.findOne(driverId);
    return this.prisma.complianceRecord.create({
      data: {
        driverId,
        companyId: dto.companyId,
        ticNumber: dto.ticNumber ?? null,
        cudapNumber: dto.cudapNumber ?? null,
        nit: dto.nit ?? null,
        commerceRegistry: dto.commerceRegistry ?? null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        status: dto.status ?? 'valid',
      },
    });
  }

  async findCompliance(driverId: number) {
    await this.findOne(driverId);
    return this.prisma.complianceRecord.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

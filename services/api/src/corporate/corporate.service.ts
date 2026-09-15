import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCorporateAccountDto } from './dto/create-corporate-account.dto';
import { UpdateCorporateAccountDto } from './dto/update-corporate-account.dto';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { CreateCorporateReservationDto } from './dto/create-corporate-reservation.dto';

@Injectable()
export class CorporateService {
  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // 1. Cuentas Corporativas B2B (CorporateAccount)
  // ===========================================================================

  async createAccount(dto: CreateCorporateAccountDto) {
    return this.prisma.corporateAccount.create({
      data: {
        companyId: dto.companyId,
        clientCompanyName: dto.clientCompanyName,
        contactName: dto.contactName ?? null,
        contactEmail: dto.contactEmail ?? null,
        paymentTerms: dto.paymentTerms ?? null,
        creditLimit: dto.creditLimit,
      },
    });
  }

  async findAllAccounts(companyId?: number) {
    const accounts = await this.prisma.corporateAccount.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        corporateReservations: {
          include: {
            tripRequest: {
              include: {
                trip: true,
              },
            },
          },
        },
        costCenters: true,
      },
      orderBy: { id: 'asc' },
    });

    // Calcular consumo acumulado y crédito disponible por empresa
    return accounts.map((acc: any) => {
      const totalSpent = acc.corporateReservations.reduce((sum: number, res: any) => {
        const tripFare = res.tripRequest?.trip?.fareTotal ?? res.estimatedCost ?? 0;
        return sum + Number(tripFare);
      }, 0);

      const availableCredit = Math.max(0, acc.creditLimit - totalSpent);

      return {
        ...acc,
        totalSpent,
        availableCredit,
        reservationsCount: acc.corporateReservations.length,
      };
    });
  }

  async findOneAccount(id: number) {
    const account = await this.prisma.corporateAccount.findUnique({
      where: { id },
      include: {
        costCenters: true,
        corporateReservations: {
          include: {
            tripRequest: {
              include: {
                trip: true,
                customer: true,
              },
            },
            costCenter: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta corporativa #${id} no encontrada`);
    }

    const totalSpent = account.corporateReservations.reduce((sum: number, res: any) => {
      const tripFare = res.tripRequest?.trip?.fareTotal ?? res.estimatedCost ?? 0;
      return sum + Number(tripFare);
    }, 0);

    return {
      ...account,
      totalSpent,
      availableCredit: Math.max(0, account.creditLimit - totalSpent),
    };
  }

  async updateAccount(id: number, dto: UpdateCorporateAccountDto) {
    await this.findOneAccount(id);
    return this.prisma.corporateAccount.update({
      where: { id },
      data: dto,
    });
  }

  async removeAccount(id: number) {
    const account = await this.findOneAccount(id);
    if (account.corporateReservations.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar la cuenta porque tiene ${account.corporateReservations.length} reservas registradas`,
      );
    }

    return this.prisma.corporateAccount.delete({
      where: { id },
    });
  }

  // ===========================================================================
  // 2. Centros de Costo (CostCenter)
  // ===========================================================================

  async createCostCenter(dto: CreateCostCenterDto) {
    return this.prisma.costCenter.create({
      data: {
        companyId: dto.companyId,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        budgetCenter: dto.budgetCenter ?? null,
      },
    });
  }

  async findAllCostCenters(companyId?: number) {
    return this.prisma.costCenter.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        _count: {
          select: { corporateReservations: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async removeCostCenter(id: number) {
    const costCenter = await this.prisma.costCenter.findUnique({
      where: { id },
      include: { corporateReservations: true },
    });

    if (!costCenter) {
      throw new NotFoundException(`Centro de costo #${id} no encontrado`);
    }

    if (costCenter.corporateReservations.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar este centro de costo porque tiene reservas históricas asociadas',
      );
    }

    return this.prisma.costCenter.delete({
      where: { id },
    });
  }

  // ===========================================================================
  // 3. Reservas Corporativas Programadas (CorporateReservation)
  // ===========================================================================

  async createReservation(dto: CreateCorporateReservationDto) {
    const account = await this.findOneAccount(dto.corporateAccountId);

    // Verificar si excede el límite de crédito disponible
    const estimated = dto.estimatedCost ?? 25.0;
    if (account.availableCredit < estimated) {
      throw new BadRequestException(
        `Crédito insuficiente: Disponible Bs ${account.availableCredit.toFixed(2)}, Requerido Bs ${estimated.toFixed(2)}`,
      );
    }

    // Transacción atómica: Crear TripRequest programado + Crear CorporateReservation
    const reservation = await this.prisma.$transaction(async (tx: any) => {
      const tripRequest = await tx.tripRequest.create({
        data: {
          companyId: account.companyId,
          customerId: dto.customerId,
          originAddress: dto.originAddress,
          destinationAddress: dto.destinationAddress,
          scheduledAt: new Date(dto.scheduledAt),
          status: 'PENDING',
        },
      });

      const corpRes = await tx.corporateReservation.create({
        data: {
          corporateAccountId: dto.corporateAccountId,
          tripRequestId: tripRequest.id,
          costCenterId: dto.costCenterId ?? null,
          reservationStatus: 'confirmed',
          tripReason: dto.tripReason ?? 'Viaje corporativo programado',
          estimatedCost: estimated,
        },
        include: {
          corporateAccount: true,
          costCenter: true,
          tripRequest: {
            include: {
              customer: true,
            },
          },
        },
      });

      return corpRes;
    });

    return reservation;
  }

  async findAllReservations(corporateAccountId?: number) {
    return this.prisma.corporateReservation.findMany({
      where: corporateAccountId ? { corporateAccountId } : undefined,
      include: {
        corporateAccount: true,
        costCenter: true,
        tripRequest: {
          include: {
            customer: true,
            trip: {
              include: {
                driver: {
                  include: { user: true },
                },
                vehicle: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReservationStatus(id: number, status: string) {
    const reservation = await this.prisma.corporateReservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva corporativa #${id} no encontrada`);
    }

    return this.prisma.corporateReservation.update({
      where: { id },
      data: { reservationStatus: status },
      include: {
        corporateAccount: true,
        costCenter: true,
        tripRequest: true,
      },
    });
  }
}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TripRequestsModule } from './trip-requests/trip-requests.module';
import { TripsModule } from './trips/trips.module';
import { PricingModule } from './pricing/pricing.module';
import { MapsModule } from './maps/maps.module';
import { TripFaresModule } from './trip-fares/trip-fares.module';
import { CorporateReportsModule } from './corporate-reports/corporate-reports.module';
import { DriversModule } from './drivers/drivers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AiModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    TripRequestsModule,
    TripsModule,
    PricingModule,
    MapsModule,
    TripFaresModule,
    CorporateReportsModule,
    DriversModule
  ],
  // Guards globales: JWT primero (autenticación), luego Roles (autorización)
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule {}

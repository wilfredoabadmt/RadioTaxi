import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
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
  controllers: [],
  providers: []
})
export class AppModule {}

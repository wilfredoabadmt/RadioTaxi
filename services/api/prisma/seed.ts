// ============================================================================
// RadioTaxi - Seed de datos de ejemplo (idempotente)
// ----------------------------------------------------------------------------
// Puebla la base con un conjunto mínimo y coherente para desarrollo:
//   1 empresa, 1 admin, 1 dispatcher, 2 conductores + vehículos, 1 pasajero,
//   1 regla de precio y 1 geofence de ejemplo (contexto Bolivia / La Paz, BOB).
//
// Ejecutar:  npm run prisma:seed   (o)   npx prisma db seed
// Es idempotente: usa upsert / búsqueda-o-crea, se puede correr varias veces.
// ============================================================================

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Contraseña común para todos los usuarios de ejemplo (solo desarrollo).
const DEV_PASSWORD = 'password123';

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  // --- Empresa -------------------------------------------------------------
  let company = await prisma.company.findFirst({
    where: { name: 'RadioTaxi Demo' },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'RadioTaxi Demo',
        companyType: 'operator',
        nit: '1234567890',
        commerceRegistry: '00123456',
        address: 'Av. 6 de Agosto #123, La Paz, Bolivia',
      },
    });
  }

  // --- Usuarios de gestión -------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@radiotaxi.demo' },
    update: {},
    create: {
      email: 'admin@radiotaxi.demo',
      password: passwordHash,
      name: 'Admin Demo',
      role: 'ADMIN',
      phone: '+59170000001',
      companyId: company.id,
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { email: 'dispatcher@radiotaxi.demo' },
    update: {},
    create: {
      email: 'dispatcher@radiotaxi.demo',
      password: passwordHash,
      name: 'Despachador Demo',
      role: 'DISPATCHER',
      phone: '+59170000002',
      companyId: company.id,
    },
  });

  // --- Pasajero ------------------------------------------------------------
  const passenger = await prisma.user.upsert({
    where: { email: 'pasajero@radiotaxi.demo' },
    update: {},
    create: {
      email: 'pasajero@radiotaxi.demo',
      password: passwordHash,
      name: 'Pasajero Demo',
      role: 'USER',
      phone: '+59170000003',
      companyId: company.id,
    },
  });

  // --- Conductores + vehículos --------------------------------------------
  // Coordenadas de ejemplo dentro de La Paz.
  const driversSeed = [
    {
      email: 'conductor1@radiotaxi.demo',
      name: 'Carlos Mamani',
      phone: '+59171111111',
      license: 'LIC-0001',
      lat: -16.5,
      lng: -68.15,
      plate: 'ABC-123',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      color: 'Blanco',
    },
    {
      email: 'conductor2@radiotaxi.demo',
      name: 'María Quispe',
      phone: '+59172222222',
      license: 'LIC-0002',
      lat: -16.51,
      lng: -68.13,
      plate: 'XYZ-789',
      brand: 'Nissan',
      model: 'Versa',
      year: 2019,
      color: 'Gris',
    },
  ];

  for (const d of driversSeed) {
    const driverUser = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        password: passwordHash,
        name: d.name,
        role: 'DRIVER',
        phone: d.phone,
        companyId: company.id,
      },
    });

    const driver = await prisma.driver.upsert({
      where: { userId: driverUser.id },
      update: { currentLat: d.lat, currentLng: d.lng },
      create: {
        userId: driverUser.id,
        licenseNumber: d.license,
        status: 'available',
        experienceYears: 5,
        currentLat: d.lat,
        currentLng: d.lng,
      },
    });

    await prisma.vehicle.upsert({
      where: { plate: d.plate },
      update: {
        driverId: driver.id,
        companyId: company.id,
        currentLat: d.lat,
        currentLng: d.lng,
      },
      create: {
        plate: d.plate,
        driverId: driver.id,
        companyId: company.id,
        brand: d.brand,
        model: d.model,
        year: d.year,
        vehicleType: 'sedan',
        color: d.color,
        status: 'available',
        currentLat: d.lat,
        currentLng: d.lng,
      },
    });
  }

  // --- Regla de precio (BOB) ----------------------------------------------
  const existingRule = await prisma.pricingRule.findFirst({
    where: { companyId: company.id, name: 'Standard' },
  });
  if (!existingRule) {
    await prisma.pricingRule.create({
      data: {
        companyId: company.id,
        name: 'Standard',
        type: 'STANDARD',
        baseFare: 5, // BOB
        kmRate: 3, // BOB por km
        minuteRate: 0.5, // BOB por minuto
        minFare: 10, // BOB mínimo
        tollSurcharge: 0,
        geofenceSurcharge: 5,
        peakMultiplier: 1.5,
        active: true,
      },
    });
  }

  // --- Geofence de ejemplo (zona centro La Paz) ---------------------------
  const existingGeofence = await prisma.geofence.findFirst({
    where: { companyId: company.id, name: 'Centro La Paz' },
  });
  if (!existingGeofence) {
    const centroLaPaz = {
      type: 'Polygon',
      coordinates: [
        [
          [-68.16, -16.49],
          [-68.12, -16.49],
          [-68.12, -16.52],
          [-68.16, -16.52],
          [-68.16, -16.49],
        ],
      ],
    };
    await prisma.geofence.create({
      data: {
        companyId: company.id,
        name: 'Centro La Paz',
        type: 'ZONE',
        surcharge: 5,
        areaGeoJson: JSON.stringify(centroLaPaz),
      },
    });
  }

  console.log('✅ Seed completado.');
  console.log(`   Empresa:     ${company.name} (id=${company.id})`);
  console.log(`   Admin:       ${admin.email} / ${DEV_PASSWORD}`);
  console.log(`   Dispatcher:  ${dispatcher.email} / ${DEV_PASSWORD}`);
  console.log(`   Pasajero:    ${passenger.email} / ${DEV_PASSWORD}`);
  console.log(`   Conductores: conductor1@radiotaxi.demo, conductor2@radiotaxi.demo / ${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

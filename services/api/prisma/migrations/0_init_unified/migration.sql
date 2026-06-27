-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "companyType" TEXT,
    "nit" TEXT,
    "commerceRegistry" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "companyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'available',
    "experienceYears" INTEGER,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverDocument" (
    "id" SERIAL NOT NULL,
    "driverId" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "plate" TEXT NOT NULL,
    "driverId" INTEGER,
    "companyId" INTEGER,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "vehicleType" TEXT,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "gpsDeviceId" TEXT,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRequest" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "driverId" INTEGER,
    "originAddress" TEXT,
    "originLat" DOUBLE PRECISION,
    "originLng" DOUBLE PRECISION,
    "destinationAddress" TEXT,
    "destinationLat" DOUBLE PRECISION,
    "destinationLng" DOUBLE PRECISION,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "TripRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" SERIAL NOT NULL,
    "tripRequestId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "fareTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fareBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fareDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fareTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fareSurcharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "distanceMeters" INTEGER,
    "durationSeconds" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripSegment" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "legOriginAddress" TEXT NOT NULL,
    "legOriginLat" DOUBLE PRECISION NOT NULL,
    "legOriginLng" DOUBLE PRECISION NOT NULL,
    "legDestinationAddress" TEXT NOT NULL,
    "legDestinationLat" DOUBLE PRECISION NOT NULL,
    "legDestinationLng" DOUBLE PRECISION NOT NULL,
    "legDistanceMeters" INTEGER,
    "legDurationSeconds" INTEGER,

    CONSTRAINT "TripSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Standard',
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "baseFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kmRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minuteRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tollSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "geofenceSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "peakMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "areaGeoJson" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ZONE',
    "surcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "areaGeoJson" TEXT,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripFare" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "pricingRuleId" INTEGER NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distanceMeters" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripFare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budgetCenter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateAccount" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "clientCompanyName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "paymentTerms" TEXT,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateReservation" (
    "id" SERIAL NOT NULL,
    "corporateAccountId" INTEGER NOT NULL,
    "tripRequestId" INTEGER NOT NULL,
    "reservationStatus" TEXT NOT NULL DEFAULT 'pending',
    "tripReason" TEXT,
    "costCenterId" INTEGER,
    "estimatedCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateReport" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "data" JSONB,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRecord" (
    "id" SERIAL NOT NULL,
    "driverId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "ticNumber" TEXT,
    "cudapNumber" TEXT,
    "nit" TEXT,
    "commerceRegistry" TEXT,
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallRecord" (
    "id" SERIAL NOT NULL,
    "callUuid" TEXT NOT NULL,
    "companyId" INTEGER,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "callerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "recordingUrl" TEXT,
    "tripId" INTEGER,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallerProfile" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "customerId" INTEGER,
    "historyNotes" TEXT,
    "frequentCustomer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "action" TEXT NOT NULL,
    "performedBy" INTEGER,
    "data" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "DriverDocument_driverId_idx" ON "DriverDocument"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE INDEX "TripRequest_customerId_idx" ON "TripRequest"("customerId");

-- CreateIndex
CREATE INDEX "TripRequest_companyId_idx" ON "TripRequest"("companyId");

-- CreateIndex
CREATE INDEX "TripRequest_driverId_idx" ON "TripRequest"("driverId");

-- CreateIndex
CREATE INDEX "TripRequest_status_idx" ON "TripRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_tripRequestId_key" ON "Trip"("tripRequestId");

-- CreateIndex
CREATE INDEX "Trip_driverId_idx" ON "Trip"("driverId");

-- CreateIndex
CREATE INDEX "Trip_vehicleId_idx" ON "Trip"("vehicleId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "TripSegment_tripId_idx" ON "TripSegment"("tripId");

-- CreateIndex
CREATE INDEX "TripFare_tripId_idx" ON "TripFare"("tripId");

-- CreateIndex
CREATE INDEX "CostCenter_companyId_idx" ON "CostCenter"("companyId");

-- CreateIndex
CREATE INDEX "CorporateAccount_companyId_idx" ON "CorporateAccount"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateReservation_tripRequestId_key" ON "CorporateReservation"("tripRequestId");

-- CreateIndex
CREATE INDEX "CorporateReservation_corporateAccountId_idx" ON "CorporateReservation"("corporateAccountId");

-- CreateIndex
CREATE INDEX "CorporateReport_companyId_idx" ON "CorporateReport"("companyId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_driverId_idx" ON "ComplianceRecord"("driverId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_companyId_idx" ON "ComplianceRecord"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CallRecord_callUuid_key" ON "CallRecord"("callUuid");

-- CreateIndex
CREATE INDEX "CallRecord_companyId_idx" ON "CallRecord"("companyId");

-- CreateIndex
CREATE INDEX "CallRecord_fromNumber_idx" ON "CallRecord"("fromNumber");

-- CreateIndex
CREATE INDEX "CallerProfile_phoneNumber_idx" ON "CallerProfile"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CallerProfile_companyId_phoneNumber_key" ON "CallerProfile"("companyId", "phoneNumber");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRequest" ADD CONSTRAINT "TripRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRequest" ADD CONSTRAINT "TripRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRequest" ADD CONSTRAINT "TripRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_tripRequestId_fkey" FOREIGN KEY ("tripRequestId") REFERENCES "TripRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSegment" ADD CONSTRAINT "TripSegment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripFare" ADD CONSTRAINT "TripFare_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripFare" ADD CONSTRAINT "TripFare_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateAccount" ADD CONSTRAINT "CorporateAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateReservation" ADD CONSTRAINT "CorporateReservation_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "CorporateAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateReservation" ADD CONSTRAINT "CorporateReservation_tripRequestId_fkey" FOREIGN KEY ("tripRequestId") REFERENCES "TripRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateReservation" ADD CONSTRAINT "CorporateReservation_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateReport" ADD CONSTRAINT "CorporateReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallerProfile" ADD CONSTRAINT "CallerProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallerProfile" ADD CONSTRAINT "CallerProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


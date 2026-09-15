-- Migration: 20260915_enums_and_states
-- Description: Convert string columns to PostgreSQL native ENUMs for UserRole, DriverStatus, VehicleStatus, TripRequestStatus, TripStatus and PaymentMethod.

-- 1. Create native ENUM types
CREATE TYPE "UserRole" AS ENUM ('USER', 'DRIVER', 'DISPATCHER', 'ADMIN');
CREATE TYPE "DriverStatus" AS ENUM ('available', 'busy', 'offline');
CREATE TYPE "VehicleStatus" AS ENUM ('available', 'busy', 'offline');
CREATE TYPE "TripRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TripStatus" AS ENUM ('ASSIGNED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'qr_bolivia', 'corporate_account');

-- 2. Alter User.role
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole";

-- 3. Alter Driver.status
ALTER TABLE "Driver" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Driver" ALTER COLUMN "status" TYPE "DriverStatus" USING ("status"::"DriverStatus");
ALTER TABLE "Driver" ALTER COLUMN "status" SET DEFAULT 'available'::"DriverStatus";

-- 4. Alter Vehicle.status
ALTER TABLE "Vehicle" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Vehicle" ALTER COLUMN "status" TYPE "VehicleStatus" USING ("status"::"VehicleStatus");
ALTER TABLE "Vehicle" ALTER COLUMN "status" SET DEFAULT 'available'::"VehicleStatus";

-- 5. Alter TripRequest.status
ALTER TABLE "TripRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "TripRequest" ALTER COLUMN "status" TYPE "TripRequestStatus" USING ("status"::"TripRequestStatus");
ALTER TABLE "TripRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"TripRequestStatus";

-- 6. Alter Trip.status and Trip.paymentMethod
ALTER TABLE "Trip" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Trip" ALTER COLUMN "status" TYPE "TripStatus" USING ("status"::"TripStatus");
ALTER TABLE "Trip" ALTER COLUMN "status" SET DEFAULT 'ASSIGNED'::"TripStatus";

ALTER TABLE "Trip" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING ("paymentMethod"::"PaymentMethod");

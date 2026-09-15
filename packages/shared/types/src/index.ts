// ============================================================================
// RadioTaxi Shared Types & Domain Contracts (Single Source of Truth)
// ============================================================================

// ---------------------------------------------------------------------------
// Enums del Dominio
// ---------------------------------------------------------------------------

export type UserRole = 'USER' | 'DRIVER' | 'DISPATCHER' | 'ADMIN';

export type TripRequestStatus = 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';

export type TripStatus = 'ASSIGNED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type VehicleStatus = 'available' | 'busy' | 'offline';

export type DriverStatus = 'available' | 'busy' | 'offline';

export type PaymentMethod = 'cash' | 'card' | 'qr_simple' | 'corporate_account';

// ---------------------------------------------------------------------------
// Máquina de Estados de Viaje
// ---------------------------------------------------------------------------

export const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  ASSIGNED: ['ARRIVED', 'IN_PROGRESS', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidTripTransition(from: TripStatus, to: TripStatus): boolean {
  const allowed = TRIP_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// ---------------------------------------------------------------------------
// Autenticación y Usuarios
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  companyId?: number | null;
  phone?: string | null;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  companyId?: number | null;
}

// ---------------------------------------------------------------------------
// Vehículos y Conductores
// ---------------------------------------------------------------------------

export interface VehicleDTO {
  id: number;
  plate: string;
  status: VehicleStatus;
  currentLat: number | null;
  currentLng: number | null;
  // Compatibilidad con frontend histórico (currentLatitude / currentLongitude)
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  vehicleType?: string | null;
  driverId?: number | null;
  companyId?: number | null;
}

export interface DriverDTO {
  id: number;
  userId: number;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  licenseNumber?: string | null;
  status: DriverStatus;
  currentLat?: number | null;
  currentLng?: number | null;
  experienceYears?: number | null;
}

// ---------------------------------------------------------------------------
// Solicitudes y Viajes
// ---------------------------------------------------------------------------

export interface TripRequestDTO {
  id: number;
  customerId: number;
  customerName?: string | null;
  customerPhone?: string | null;
  companyId?: number | null;
  driverId?: number | null;
  originAddress?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destinationAddress?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  status: TripRequestStatus;
  requestedAt: Date | string;
  scheduledAt?: Date | string | null;
  acceptedAt?: Date | string | null;
  completedAt?: Date | string | null;
}

export interface CreateTripRequestInput {
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationAddress?: string;
  destinationLat?: number;
  destinationLng?: number;
  scheduledAt?: string;
}

export interface TripDTO {
  id: number;
  tripRequestId: number;
  driverId: number;
  vehicleId: number;
  status: TripStatus;
  fareTotal: number;
  fareBase: number;
  fareDistance: number;
  fareTime: number;
  fareSurcharges: number;
  paymentMethod?: PaymentMethod | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  driver?: DriverDTO;
  vehicle?: VehicleDTO;
  tripRequest?: TripRequestDTO;
}

// ---------------------------------------------------------------------------
// Tarificación
// ---------------------------------------------------------------------------

export interface FareCalculationInput {
  originLat: number;
  originLng: number;
  destinationLat?: number;
  destinationLng?: number;
  companyId?: number;
  vehicleType?: string;
  scheduledTime?: Date | string;
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surcharges: number;
  tollSurcharge: number;
  geofenceSurcharge: number;
  peakMultiplier: number;
  totalFare: number;
  distanceMeters: number;
  durationSeconds: number;
  currency: 'BOB';
}

// ---------------------------------------------------------------------------
// Contratos de Eventos Realtime (Socket.io)
// ---------------------------------------------------------------------------

export interface ClientToServerEvents {
  'trip:assign': (data: { tripRequestId: number; vehicleId: number }, callback?: (res: any) => void) => void;
  'trip:start': (data: { tripId: number }, callback?: (res: any) => void) => void;
  'trip:arrived': (data: { tripId: number }, callback?: (res: any) => void) => void;
  'trip:complete': (data: { tripId?: number; vehicleId?: number }, callback?: (res: any) => void) => void;
  'trip:cancel': (data: { tripId: number; reason?: string }, callback?: (res: any) => void) => void;
  'trip:offer': (data: { tripRequestId: number; driverId: number; timeoutSeconds?: number }, callback?: (res: any) => void) => void;
  'trip:accept': (data: { tripRequestId: number; vehicleId: number }, callback?: (res: any) => void) => void;
  'trip:reject': (data: { tripRequestId: number; reason?: string }, callback?: (res: any) => void) => void;
  'vehicle:update': (data: { vehicleId: number; lat: number; lng: number; speed?: number }) => void;
  'room:join': (room: string) => void;
  'room:leave': (room: string) => void;
}

export interface ServerToClientEvents {
  'vehicles:update': (vehicles: VehicleDTO[]) => void;
  'trip-requests:update': (requests: TripRequestDTO[]) => void;
  'trip:status_changed': (trip: TripDTO) => void;
  'trip:assigned': (data: { tripRequestId: number; vehicleId: number; tripId: number }) => void;
  'trip:offered': (data: {
    offerId: string;
    tripRequestId: number;
    originAddress?: string | null;
    destinationAddress?: string | null;
    timeoutSeconds: number;
    offeredAt: string;
  }) => void;
  'trip:offer_rejected': (data: { tripRequestId: number; driverId?: number; reason: string }) => void;
  'trip:cancelled': (data: { tripId: number; tripRequestId: number; status: string; reason?: string }) => void;
  'vehicle:location_changed': (data: { vehicleId: number; lat: number; lng: number }) => void;
  'notification': (data: { message: string; type: 'info' | 'warning' | 'error' | 'success' }) => void;
}

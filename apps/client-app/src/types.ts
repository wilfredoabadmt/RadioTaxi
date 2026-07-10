// Tipos compartidos entre la client-app y el backend.

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  companyId?: number | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

// Nueva interfaz para crear solicitudes de viaje
export interface CreateTripRequestInput {
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  scheduledAt?: string;
  companyId?: number;
}

// Tipos para el seguimiento de solicitudes de viaje
export interface TripRequestDetail {
  id: number;
  customerId: number;
  originAddress: string | null;
  originLat: number | null;
  originLng: number | null;
  destinationAddress: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  status: string; // PENDING | ACCEPTED | COMPLETED | CANCELLED
  scheduledAt: string | null;
  requestedAt: string;
  driver?: {
    id: number;
    name: string | null;
    phone: string | null;
  } | null;
  vehicle?: {
    id: number;
    plate: string | null;
    currentLatitude: number | null;
    currentLongitude: number | null;
  } | null;
}

// Detalle del viaje obtenido de la API
export interface TripDetail {
  id: number;
  status: string;
  fareTotal: number;
  startedAt: string;
  endedAt: string | null;
  tripRequest: {
    id: number;
    originAddress: string | null;
    originLat: number | null;
    originLng: number | null;
    destinationAddress: string | null;
    destinationLat: number | null;
    destinationLng: number | null;
    status: string;
    customer: {
      id: number;
      name: string | null;
      phone: string | null;
    } | null;
  };
  vehicle: {
    id: number;
    plate: string | null;
  };
}

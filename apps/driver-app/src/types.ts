// Tipos compartidos entre la driver-app y el backend.

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

// Asignación de viaje entrante vía Socket.io (evento 'trip:assigned')
export interface TripAssignment {
  tripRequestId: number;
  vehicleId: number;
  tripId: number;
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

// Desglose de tarifa al completar (evento 'trip:completed')
export interface FareBreakdown {
  ruleId: number;
  baseFare: number;
  distanceCost: number;
  timeCost: number;
  geofenceSurcharge: number;
  tollSurcharge: number;
  peakMultiplier: number;
  total: number;
}

export interface TripCompletedEvent {
  tripId: number;
  vehicleId: number;
  fareTotal: number;
  fareBreakdown: FareBreakdown | null;
}

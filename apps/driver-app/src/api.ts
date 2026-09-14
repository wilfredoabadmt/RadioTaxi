import { AuthResponse } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Login contra la API NestJS.
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Credenciales inválidas');
  }

  return res.json();
}

/**
 * Obtiene el detalle de un viaje (incluye origen/destino/cliente).
 */
export async function fetchTrip(tripId: number, token: string) {
  const res = await fetch(`${API_URL}/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener el viaje');
  }

  return res.json();
}

/**
 * Transición de estado: Conductor llegó al punto de recogida (ASSIGNED -> ARRIVED)
 */
export async function markTripArrived(tripId: number, token: string) {
  const res = await fetch(`${API_URL}/trips/${tripId}/arrived`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'No se pudo marcar llegada');
  }

  return res.json();
}

/**
 * Transición de estado: Iniciar viaje con pasajero a bordo (ARRIVED -> IN_PROGRESS)
 */
export async function startTrip(tripId: number, token: string) {
  const res = await fetch(`${API_URL}/trips/${tripId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'No se pudo iniciar el viaje');
  }

  return res.json();
}

/**
 * Transición de estado: Finalizar viaje y liquidar tarifa (IN_PROGRESS -> COMPLETED)
 */
export async function completeTripApi(tripId: number, token: string) {
  const res = await fetch(`${API_URL}/trips/${tripId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'No se pudo completar el viaje');
  }

  return res.json();
}

/**
 * Obtiene el vehículo asignado al conductor para emitir GPS aun cuando esté disponible/libre.
 */
export async function fetchAssignedVehicle(token: string) {
  try {
    const res = await fetch(`${API_URL}/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  } catch {
    return null;
  }
}

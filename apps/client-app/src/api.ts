import { AuthResponse, CreateTripRequestInput, TripRequestDetail, TripDetail } from './types';

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
 * Registro de usuario cliente contra la API NestJS.
 */
export async function register(
  email: string,
  password: string,
  name?: string,
  phone?: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, phone, role: 'USER' }), // Rol USER por defecto
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Error al registrar usuario');
  }

  return res.json();
}

/**
 * Crea una nueva solicitud de viaje.
 */
export async function createTripRequest(data: CreateTripRequestInput, token: string): Promise<TripRequestDetail> {
  const res = await fetch(`${API_URL}/trip-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Error al crear solicitud de viaje' }));
    throw new Error(errorData.message || 'Error desconocido al crear solicitud');
  }

  return res.json();
}

/**
 * Obtiene las solicitudes de viaje del cliente autenticado.
 */
export async function fetchMyTripRequests(token: string): Promise<TripRequestDetail[]> {
  const res = await fetch(`${API_URL}/trip-requests/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Error al obtener solicitudes de viaje' }));
    throw new Error(errorData.message || 'Error desconocido al obtener solicitudes');
  }
  return res.json();
}

/**
 * Obtiene el detalle de un viaje (incluye origen/destino/cliente).
 * Esto será para el historial, o para el viaje activo.
 */
export async function fetchTrip(tripId: number, token: string): Promise<TripDetail> {
  const res = await fetch(`${API_URL}/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'No se pudo obtener el viaje' }));
    throw new Error(errorData.message || 'Error desconocido al obtener el viaje');
  }

  return res.json();
}

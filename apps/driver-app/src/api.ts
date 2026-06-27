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

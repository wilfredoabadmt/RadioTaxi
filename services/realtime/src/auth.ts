// ============================================================================
// Autenticación/Autorización del socket de realtime.
// Verifica el MISMO JWT que emite services/api (HS256, payload {sub,email,role},
// secreto JWT_SECRET). Así una sola identidad vale para REST y socket.
// ============================================================================

import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

// Debe coincidir con services/api/src/auth/jwt-secret.util.ts
const INSECURE_DEFAULT = 'dev-insecure-secret';

export interface SocketUser {
  id: number;
  email: string;
  role: string;
}

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

/**
 * Fuente única del secreto JWT (misma política que la API):
 * en producción exige un secreto real (>=32 chars, distinto del default);
 * en desarrollo cae al default inseguro con advertencia.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!secret || secret === INSECURE_DEFAULT || secret.length < 32) {
      throw new Error(
        'JWT_SECRET inválido: en producción define un secreto aleatorio de al menos 32 caracteres.',
      );
    }
    return secret;
  }

  if (!secret) {
    console.warn(
      '[realtime][auth] JWT_SECRET no definido; usando secreto de desarrollo inseguro. NO usar en producción.',
    );
    return INSECURE_DEFAULT;
  }

  return secret;
}

const JWT_SECRET = resolveJwtSecret();

function extractToken(socket: Socket): string | null {
  // 1) handshake.auth.token (socket.io-client { auth: { token } })
  const authToken = (socket.handshake.auth as { token?: string } | undefined)?.token;
  if (authToken) return authToken.replace(/^Bearer\s+/i, '');

  // 2) Authorization: Bearer <token>
  const header = socket.handshake.headers?.authorization;
  if (header) return header.replace(/^Bearer\s+/i, '');

  return null;
}

/**
 * Middleware de handshake: rechaza conexiones sin JWT válido y adjunta
 * `socket.data.user`.
 */
export function authMiddleware(socket: Socket, next: (err?: Error) => void): void {
  try {
    const token = extractToken(socket);
    if (!token) {
      return next(new Error('unauthorized: falta token de autenticación'));
    }
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    socket.data.user = { id: payload.sub, email: payload.email, role: payload.role } as SocketUser;
    next();
  } catch {
    next(new Error('unauthorized: token inválido o expirado'));
  }
}

export function getUser(socket: Socket): SocketUser | undefined {
  return socket.data.user as SocketUser | undefined;
}

export function hasRole(socket: Socket, ...roles: string[]): boolean {
  const user = getUser(socket);
  return !!user && roles.includes(user.role);
}

/**
 * Verifica que el vehículo pertenezca al conductor autenticado
 * (Vehicle -> Driver.userId === userId del socket).
 */
export async function driverOwnsVehicle(
  prisma: PrismaClient,
  userId: number,
  vehicleId: number,
): Promise<boolean> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { driver: true },
  });
  return !!vehicle?.driver && vehicle.driver.userId === userId;
}

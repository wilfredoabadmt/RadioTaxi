import jwt from 'jsonwebtoken';
import { authMiddleware, hasRole, resolveJwtSecret } from './auth';

describe('Realtime Socket Service (Fase 9.2 - Unit & Handlers Testing)', () => {
  const secret = resolveJwtSecret();

  describe('Auth Middleware', () => {
    it('debe rechazar conexión si falta el token', () => {
      const mockSocket: any = {
        handshake: {
          auth: {},
          headers: {},
        },
        data: {},
      };
      const next = jest.fn();

      authMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('falta token') })
      );
      expect(mockSocket.data.user).toBeUndefined();
    });

    it('debe rechazar conexión si el token es inválido o corrupto', () => {
      const mockSocket: any = {
        handshake: {
          auth: { token: 'invalid.jwt.token' },
        },
        data: {},
      };
      const next = jest.fn();

      authMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('inválido o expirado') })
      );
      expect(mockSocket.data.user).toBeUndefined();
    });

    it('debe autenticar y adjuntar user si el token es válido', () => {
      const validToken = jwt.sign(
        { sub: 42, email: 'chofer@radiotaxi.bo', role: 'DRIVER', companyId: 1 },
        secret,
        { algorithm: 'HS256' }
      );

      const mockSocket: any = {
        handshake: {
          auth: { token: validToken },
        },
        data: {},
      };
      const next = jest.fn();

      authMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith();
      expect(mockSocket.data.user).toEqual({
        id: 42,
        email: 'chofer@radiotaxi.bo',
        role: 'DRIVER',
        companyId: 1,
      });
    });
  });

  describe('Role-Based Access Control (hasRole)', () => {
    it('debe permitir si el socket tiene uno de los roles permitidos', () => {
      const dispatcherSocket: any = {
        data: {
          user: { id: 10, role: 'DISPATCHER', email: 'dispatch@radiotaxi.bo' },
        },
      };

      expect(hasRole(dispatcherSocket, 'ADMIN', 'DISPATCHER')).toBe(true);
      expect(hasRole(dispatcherSocket, 'DRIVER')).toBe(false);
    });

    it('debe denegar si el socket no tiene usuario autenticado', () => {
      const anonSocket: any = { data: {} };
      expect(hasRole(anonSocket, 'ADMIN')).toBe(false);
    });
  });

  describe('Transiciones de Ciclo de Vida del Viaje (Fase 2.10)', () => {
    const TRIP_TRANSITIONS: Record<string, string[]> = {
      ASSIGNED: ['ARRIVED', 'IN_PROGRESS', 'CANCELLED'],
      ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    function isTransitionAllowed(from: string, to: string): boolean {
      return (TRIP_TRANSITIONS[from] || []).includes(to);
    }

    it('debe permitir transiciones legales de despacho y ejecución', () => {
      expect(isTransitionAllowed('ASSIGNED', 'ARRIVED')).toBe(true);
      expect(isTransitionAllowed('ARRIVED', 'IN_PROGRESS')).toBe(true);
      expect(isTransitionAllowed('IN_PROGRESS', 'COMPLETED')).toBe(true);
      expect(isTransitionAllowed('ASSIGNED', 'CANCELLED')).toBe(true);
      expect(isTransitionAllowed('ARRIVED', 'CANCELLED')).toBe(true);
      expect(isTransitionAllowed('IN_PROGRESS', 'CANCELLED')).toBe(true);
    });

    it('debe bloquear transiciones ilegales desde estados terminales', () => {
      expect(isTransitionAllowed('COMPLETED', 'IN_PROGRESS')).toBe(false);
      expect(isTransitionAllowed('COMPLETED', 'ASSIGNED')).toBe(false);
      expect(isTransitionAllowed('CANCELLED', 'ASSIGNED')).toBe(false);
      expect(isTransitionAllowed('CANCELLED', 'COMPLETED')).toBe(false);
    });
  });
});

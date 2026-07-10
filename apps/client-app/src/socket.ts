import { io, Socket } from 'socket.io-client';

const REALTIME_URL = process.env.EXPO_PUBLIC_REALTIME_URL || 'http://localhost:3002';

let socket: Socket | null = null;

/**
 * Devuelve el singleton del socket conectado al servicio realtime.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(REALTIME_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

/**
 * Cierra y destruye el socket (al cerrar sesión).
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

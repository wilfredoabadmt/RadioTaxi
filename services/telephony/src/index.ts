import http from 'http';
import { io as createSocketClient, Socket } from 'socket.io-client';

const PORT = Number(process.env.PORT) || 3003;
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const REALTIME_URL = process.env.REALTIME_URL || 'http://localhost:3002';
const ASTERISK_ARI_URL = process.env.ASTERISK_ARI_URL || 'http://localhost:8088/ari';
const ASTERISK_ARI_USER = process.env.ASTERISK_ARI_USER || 'radiotaxi_ari';
const ASTERISK_ARI_PASS = process.env.ASTERISK_ARI_PASS || 'RadioTaxiAriPass2026!';

console.log('================================================================');
console.log('📞 RadioTaxi SaaS — Telephony & VoIP Gateway Service');
console.log(`- API URL:          ${API_URL}`);
console.log(`- Realtime Gateway: ${REALTIME_URL}`);
console.log(`- Asterisk ARI:     ${ASTERISK_ARI_URL}`);
console.log('================================================================');

// ---------------------------------------------------------------------------
// Cliente Socket hacia Realtime para emisión de eventos a la central
// ---------------------------------------------------------------------------
let realtimeSocket: Socket | null = null;

function connectToRealtime() {
  try {
    realtimeSocket = createSocketClient(REALTIME_URL, {
      reconnection: true,
      reconnectionDelay: 3000,
      transports: ['websocket', 'polling'],
    });

    realtimeSocket.on('connect', () => {
      console.log(`[telephony] ✅ Conectado al gateway de realtime (${REALTIME_URL})`);
    });

    realtimeSocket.on('disconnect', () => {
      console.warn('[telephony] ⚠️ Desconectado de realtime. Reintentando...');
    });

    realtimeSocket.on('connect_error', (err) => {
      // Advertencia no bloqueante
      console.log(`[telephony] Esperando disponibilidad de realtime (${err.message})`);
    });
  } catch (err) {
    console.error('[telephony] Error inicializando cliente socket:', err);
  }
}

connectToRealtime();

// ---------------------------------------------------------------------------
// Funciones auxiliares para comunicación con la API REST
// ---------------------------------------------------------------------------
async function notifyApiCallEvent(payload: {
  callUuid: string;
  fromNumber: string;
  toNumber?: string;
  callerId?: string;
  companyId?: number;
  eventType: 'RINGING' | 'ANSWERED' | 'ENDED';
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  recordingUrl?: string;
}) {
  try {
    const res = await fetch(`${API_URL}/calls/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[telephony] Error notificando al API (${res.status}):`, errText);
      return null;
    }

    return await res.json();
  } catch (err: any) {
    console.error('[telephony] Fallo de red comunicando con API:', err.message);
    return null;
  }
}

async function fetchCallerProfile(phoneNumber: string, companyId = 1) {
  try {
    const res = await fetch(`${API_URL}/calls/profile/${encodeURIComponent(phoneNumber)}?companyId=${companyId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Silencioso si API aún no está disponible
  }
  return {
    phoneNumber,
    displayName: `Cliente (${phoneNumber})`,
    frequentCustomer: false,
    totalTripsCount: 0,
    frequentAddresses: [],
  };
}

// ---------------------------------------------------------------------------
// Procesamiento central de llamadas (tanto desde Asterisk como del Simulador)
// ---------------------------------------------------------------------------
export async function handleIncomingCall(data: {
  callUuid?: string;
  fromNumber: string;
  toNumber?: string;
  callerId?: string;
  companyId?: number;
}) {
  const callUuid = data.callUuid || `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const companyId = data.companyId || 1;

  console.log(`[telephony] 🔔 INCOMING CALL: ${data.fromNumber} -> ${data.toNumber || 'Central'} [${callUuid}]`);

  // 1. Notificar a la API y obtener/crear perfil
  const apiResult = await notifyApiCallEvent({
    callUuid,
    fromNumber: data.fromNumber,
    toNumber: data.toNumber,
    callerId: data.callerId,
    companyId,
    eventType: 'RINGING',
    startedAt: new Date().toISOString(),
  });

  // 2. Obtener perfil enriquecido para el despachador
  const profile = apiResult?.profile || (await fetchCallerProfile(data.fromNumber, companyId));

  // 3. Emitir evento vía Socket para el Pop-up interactivo en el Dashboard
  const eventPayload = {
    callUuid,
    fromNumber: data.fromNumber,
    toNumber: data.toNumber || 'Central',
    callerId: data.callerId || profile.displayName,
    companyId,
    timestamp: new Date().toISOString(),
    profile,
  };

  if (realtimeSocket && realtimeSocket.connected) {
    realtimeSocket.emit('call:incoming', eventPayload);
  }

  return eventPayload;
}

export async function handleCallAnswered(callUuid: string, companyId = 1) {
  console.log(`[telephony] 📞 CALL ANSWERED: [${callUuid}]`);

  await notifyApiCallEvent({
    callUuid,
    fromNumber: 'N/A',
    companyId,
    eventType: 'ANSWERED',
    startedAt: new Date().toISOString(),
  });

  if (realtimeSocket && realtimeSocket.connected) {
    realtimeSocket.emit('call:answered', { callUuid, companyId });
  }
}

export async function handleCallEnded(data: {
  callUuid: string;
  durationSeconds?: number;
  recordingUrl?: string;
  companyId?: number;
}) {
  const companyId = data.companyId || 1;
  const durationSeconds = data.durationSeconds ?? 45;
  const recordingUrl = data.recordingUrl || `http://localhost:3003/recordings/${data.callUuid}.wav`;

  console.log(`[telephony] 📴 CALL ENDED: [${data.callUuid}] duración: ${durationSeconds}s`);

  await notifyApiCallEvent({
    callUuid: data.callUuid,
    fromNumber: 'N/A',
    companyId,
    eventType: 'ENDED',
    endedAt: new Date().toISOString(),
    durationSeconds,
    recordingUrl,
  });

  if (realtimeSocket && realtimeSocket.connected) {
    realtimeSocket.emit('call:ended', {
      callUuid: data.callUuid,
      durationSeconds,
      recordingUrl,
      companyId,
    });
  }
}

// ---------------------------------------------------------------------------
// Conector Asterisk ARI (Asterisk REST Interface)
// ---------------------------------------------------------------------------
async function checkAsteriskConnection() {
  try {
    const authHeader = 'Basic ' + Buffer.from(`${ASTERISK_ARI_USER}:${ASTERISK_ARI_PASS}`).toString('base64');
    const res = await fetch(`${ASTERISK_ARI_URL}/asterisk/info`, {
      headers: { Authorization: authHeader },
    });
    if (res.ok) {
      console.log('[telephony] 🟢 Asterisk PBX detectado y en línea en', ASTERISK_ARI_URL);
    } else {
      console.log('[telephony] ⚪ Asterisk ARI respondió con estado:', res.status);
    }
  } catch (err: any) {
    console.log('[telephony] ⚪ Modo PBX Standby (Asterisk no iniciado todavía o simulado). Conector en espera.');
  }
}

setTimeout(checkAsteriskConnection, 2000);

// ---------------------------------------------------------------------------
// Servidor HTTP con endpoints REST y Simulador Interactivo
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  // Healthcheck
  if (url.pathname === '/health' || url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'OK',
        service: 'service-telephony',
        realtimeConnected: realtimeSocket?.connected ?? false,
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  // Helper para leer body JSON
  const readJsonBody = async (): Promise<any> => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          resolve({});
        }
      });
    });
  };

  // Endpoint: Simular llamada entrante
  if (req.method === 'POST' && url.pathname === '/simulate/incoming-call') {
    const body = await readJsonBody();
    const fromNumber = body.fromNumber || '+591 71234567';
    const result = await handleIncomingCall({
      callUuid: body.callUuid,
      fromNumber,
      toNumber: body.toNumber || '700-TAXIS',
      callerId: body.callerId,
      companyId: body.companyId || 1,
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, call: result }));
    return;
  }

  // Endpoint: Simular contestar llamada
  if (req.method === 'POST' && url.pathname === '/simulate/answer') {
    const body = await readJsonBody();
    if (!body.callUuid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'callUuid es obligatorio' }));
      return;
    }

    await handleCallAnswered(body.callUuid, body.companyId || 1);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Llamada marcada como contestada' }));
    return;
  }

  // Endpoint: Simular colgar / fin de llamada
  if (req.method === 'POST' && url.pathname === '/simulate/hangup') {
    const body = await readJsonBody();
    if (!body.callUuid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'callUuid es obligatorio' }));
      return;
    }

    await handleCallEnded({
      callUuid: body.callUuid,
      durationSeconds: body.durationSeconds,
      recordingUrl: body.recordingUrl,
      companyId: body.companyId || 1,
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Llamada finalizada y audio guardado' }));
    return;
  }

  // Mock de reproductor de grabaciones de audio WAV
  if (req.method === 'GET' && url.pathname.startsWith('/recordings/')) {
    res.writeHead(200, { 'Content-Type': 'audio/wav' });
    // Generar cabecera WAV de 44 bytes silencioso simulado
    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20); // PCM
    wavHeader.writeUInt16LE(1, 22); // Mono
    wavHeader.writeUInt32LE(8000, 24); // 8kHz
    wavHeader.writeUInt32LE(16000, 28);
    wavHeader.writeUInt16LE(2, 32);
    wavHeader.writeUInt16LE(16, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(0, 40);
    res.end(wavHeader);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, () => {
  console.log(`[telephony] 🚀 Servicio de telefonía escuchando en http://localhost:${PORT}`);
});

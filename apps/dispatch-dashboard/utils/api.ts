/**
 * Utilidades centralizadas de API y autenticación para el Dispatch Dashboard
 */

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

export const getRealtimeUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3002';
  let url = raw.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    url = url.replace(/^http:\/\//i, 'https://');
  }
  return url;
};

/**
 * Limpia credenciales caducadas y redirige a la pantalla de login
 */
export const handleAuthExpired = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Prevenir bucles de redirección si ya estamos en /login
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?expired=1';
    }
  }
};

/**
 * Wrapper de fetch que inyecta automáticamente el token y gestiona respuestas 401
 */
export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    handleAuthExpired();
    throw new Error('Sesión expirada o no autorizada. Redirigiendo a inicio de sesión...');
  }

  return res;
};

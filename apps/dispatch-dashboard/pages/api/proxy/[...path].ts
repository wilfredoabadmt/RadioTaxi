import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false, // Transmitir stream de datos sin alterar el body
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: subPathParts } = req.query;
  const subPath = Array.isArray(subPathParts) ? subPathParts.join('/') : subPathParts || '';

  // Determinar la URL base de la API backend
  let targetBase = process.env.NEXT_PUBLIC_API_URL || 'http://radiotaxi-api.89.116.29.168.sslip.io';
  
  // Si en producción quedó como localhost, usar el dominio público de la API en Coolify
  if (targetBase.includes('localhost') && process.env.NODE_ENV === 'production') {
    targetBase = 'http://radiotaxi-api.89.116.29.168.sslip.io';
  }

  const cleanBase = targetBase.endsWith('/api') ? targetBase : `${targetBase.replace(/\/+$/, '')}/api`;
  const queryString = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const targetUrl = `${cleanBase}/${subPath}${queryString}`;

  try {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (
        key !== 'host' &&
        key !== 'content-length' &&
        key !== 'connection' &&
        typeof value === 'string'
      ) {
        headers[key] = value;
      }
    }

    // Leer el body crudo si la petición es POST, PUT, PATCH, DELETE
    let bodyBuffer: Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      if (chunks.length > 0) {
        bodyBuffer = Buffer.concat(chunks);
      }
    }

    const apiRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyBuffer as any,
    });

    res.status(apiRes.status);
    apiRes.headers.forEach((value, key) => {
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    const data = await apiRes.arrayBuffer();
    res.send(Buffer.from(data));
  } catch (error: any) {
    console.error(`[Proxy Gateway Error] Failed to fetch ${targetUrl}:`, error);
    res.status(502).json({
      statusCode: 502,
      message: 'Error al conectar con la API de RadioTaxi',
      error: error?.message || 'Bad Gateway',
      target: targetUrl,
    });
  }
}

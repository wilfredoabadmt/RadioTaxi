import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(6371000 * c);
}


export interface GeocodeResult {
  formattedAddress: string;
  lat: number;
  lng: number;
  boundingbox?: string[];
}

export interface RouteResult {
  distanceText: string;
  distanceMeters: number;
  durationText: string;
  durationSeconds: number;
  startCoords: string;
  endCoords: string;
  polyline: string;
}

interface NominatimRawItem {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: string[];
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: string;
}

interface OsrmRawResponse {
  routes?: OsrmRoute[];
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly nominatimBase = 'https://nominatim.openstreetmap.org';
  private readonly osrmBase = 'https://router.project-osrm.org';

  // Caché en memoria para evitar saturar Nominatim y OSRM (TTL: Geocoding 2h, Rutas 30min)
  private readonly geocodeCache = new Map<string, CacheEntry<GeocodeResult[]>>();
  private readonly routeCache = new Map<string, CacheEntry<RouteResult>>();

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RadioTaxi SaaS Platform - OpenStreetMap Integration',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `OpenStreetMap request failed with status ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private isCoordinatePair(value: string): boolean {
    return /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(value.trim());
  }

  private async resolveLocation(value: string): Promise<string> {
    const trimmed = value.trim();
    if (this.isCoordinatePair(trimmed)) {
      return trimmed;
    }

    const results = await this.geocodeAddress(trimmed);
    if (results.length === 0) {
      throw new InternalServerErrorException(`No se encontró la dirección: ${value}`);
    }

    return `${results[0].lat},${results[0].lng}`;
  }

  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    const cacheKey = address.trim().toLowerCase();
    const cached = this.geocodeCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    try {
      const url = new URL(`${this.nominatimBase}/search`);
      url.searchParams.set('q', address);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '5');
      url.searchParams.set('addressdetails', '1');

      const rawItems = await this.fetchJson<NominatimRawItem[]>(url.toString());

      if (!Array.isArray(rawItems)) {
        throw new InternalServerErrorException('Respuesta de geocodificación inválida de OpenStreetMap');
      }

      const results: GeocodeResult[] = rawItems.map((result) => ({
        formattedAddress: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        boundingbox: result.boundingbox,
      }));

      // Cachear por 2 horas
      this.geocodeCache.set(cacheKey, {
        data: results,
        expiresAt: now + 2 * 60 * 60 * 1000,
      });

      return results;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Nominatim geocoding fallo para "${address}": ${message}.`);
      throw new InternalServerErrorException(`Error al geocodificar dirección: ${address}`);
    }
  }

  async calculateRoute(origin: string, destination: string): Promise<RouteResult> {
    const originCoords = await this.resolveLocation(origin);
    const destinationCoords = await this.resolveLocation(destination);
    const cacheKey = `${originCoords}|${destinationCoords}`;
    const now = Date.now();

    const cached = this.routeCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    try {
      const url = new URL(`${this.osrmBase}/route/v1/driving/${originCoords};${destinationCoords}`);
      url.searchParams.set('overview', 'full');
      url.searchParams.set('geometries', 'polyline');

      const data = await this.fetchJson<OsrmRawResponse>(url.toString());

      if (!data.routes || data.routes.length === 0) {
        throw new InternalServerErrorException('No se pudo calcular la ruta con OpenStreetMap/OSRM');
      }

      const route = data.routes[0];
      const result: RouteResult = {
        distanceText: `${(route.distance / 1000).toFixed(1)} km`,
        distanceMeters: Math.round(route.distance),
        durationText: `${Math.ceil(route.duration / 60)} min`,
        durationSeconds: Math.round(route.duration),
        startCoords: originCoords,
        endCoords: destinationCoords,
        polyline: route.geometry,
      };

      // Cachear por 30 minutos
      this.routeCache.set(cacheKey, {
        data: result,
        expiresAt: now + 30 * 60 * 1000,
      });

      return result;
    } catch (err: unknown) {
      // Fallback elegante con cálculo ortodrómico (Haversine) si OSRM está saturado o fuera de línea
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`OSRM fallo para ${originCoords} -> ${destinationCoords}: ${message}. Aplicando fallback Haversine.`);

      const [lat1, lon1] = originCoords.split(',').map(Number);
      const [lat2, lon2] = destinationCoords.split(',').map(Number);

      // Factor de corrección vial urbano ~1.3 sobre distancia recta
      const directMeters = calculateHaversineDistance(lat1, lon1, lat2, lon2);
      const estimatedMeters = Math.round(directMeters * 1.3);
      // Velocidad promedio urbana 25 km/h
      const estimatedSeconds = Math.round((estimatedMeters / (25000 / 3600)));

      return {
        distanceText: `${(estimatedMeters / 1000).toFixed(1)} km (estimado)`,
        distanceMeters: estimatedMeters,
        durationText: `${Math.ceil(estimatedSeconds / 60)} min`,
        durationSeconds: estimatedSeconds,
        startCoords: originCoords,
        endCoords: destinationCoords,
        polyline: '',
      };
    }
  }
}

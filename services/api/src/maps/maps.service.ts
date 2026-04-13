import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class MapsService {
  private readonly nominatimBase = 'https://nominatim.openstreetmap.org';
  private readonly osrmBase = 'https://router.project-osrm.org';

  private async fetchJson(url: string) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RadioTaxi SaaS Platform - OpenStreetMap Integration',
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`OpenStreetMap request failed with status ${response.status}`);
    }

    return response.json();
  }

  private isCoordinatePair(value: string) {
    return /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(value.trim());
  }

  private async resolveLocation(value: string) {
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

  async geocodeAddress(address: string) {
    const url = new URL(`${this.nominatimBase}/search`);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '1');

    const data = await this.fetchJson(url.toString()) as any[];

    if (!Array.isArray(data)) {
      throw new InternalServerErrorException('Respuesta de geocodificación inválida de OpenStreetMap');
    }

    return data.map((result: any) => ({
      formattedAddress: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      boundingbox: result.boundingbox
    }));
  }

  async calculateRoute(origin: string, destination: string) {
    const originCoords = await this.resolveLocation(origin);
    const destinationCoords = await this.resolveLocation(destination);

    const url = new URL(`${this.osrmBase}/route/v1/driving/${originCoords};${destinationCoords}`);
    url.searchParams.set('overview', 'full');
    url.searchParams.set('geometries', 'polyline');

    const data = await this.fetchJson(url.toString()) as any;

    if (!data.routes || data.routes.length === 0) {
      throw new InternalServerErrorException('No se pudo calcular la ruta con OpenStreetMap/OSRM');
    }

    const route = data.routes[0] as any;

    return {
      distanceText: `${(route.distance / 1000).toFixed(1)} km`,
      distanceMeters: route.distance,
      durationText: `${Math.ceil(route.duration / 60)} min`,
      durationSeconds: route.duration,
      startCoords: originCoords,
      endCoords: destinationCoords,
      polyline: route.geometry
    };
  }
}

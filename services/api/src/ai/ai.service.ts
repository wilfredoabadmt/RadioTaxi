import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GenerateContentOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerateContentResult {
  text: string;
  model: string;
  finishReason?: string;
}

export interface DispatchVehicleInput {
  vehicleId: number;
  currentLatitude?: number;
  currentLongitude?: number;
  vehicleType?: string;
  plate?: string;
}

export interface DispatchTripRequestInput {
  tripRequestId: number;
  originLat?: number;
  originLng?: number;
  originAddress?: string;
  destinationLat?: number;
  destinationLng?: number;
  destinationAddress?: string;
}

export interface DispatchSuggestion {
  recommendedVehicleId: number;
  reason: string;
  rankedVehicles?: { vehicleId: number; distanceMeters?: number; score?: number }[];
  source: 'ai' | 'heuristic';
  model?: string;
}

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-flash-latest';
  }

  private async fetchJson(url: string, body: unknown) {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'Falta la configuración GEMINI_API_KEY en el servidor'
      );
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': this.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new InternalServerErrorException(
        `La solicitud a Gemini falló con estado ${response.status}: ${errorBody}`
      );
    }

    return response.json();
  }

  async generateContent(
    prompt: string,
    options?: GenerateContentOptions
  ): Promise<GenerateContentResult> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent`;

    const generationConfig: Record<string, unknown> = {};
    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options?.maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxOutputTokens;
    }

    const payload = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      ...(Object.keys(generationConfig).length > 0 && { generationConfig })
    };

    const data = (await this.fetchJson(url, payload)) as any;

    const candidate = data?.candidates?.[0];
    if (!candidate) {
      throw new InternalServerErrorException('Gemini no devolvió candidatos');
    }

    const text: string = candidate?.content?.parts
      ?.map((part: any) => part?.text ?? '')
      .join('') ?? '';

    return {
      text,
      model: this.model,
      finishReason: candidate?.finishReason
    };
  }

  // -------------------------------------------------------------------------
  // Despacho asistido: sugiere el mejor vehículo para una solicitud de viaje.
  // Usa Gemini si hay API key; si no, cae a heurística por distancia.
  // -------------------------------------------------------------------------

  /**
   * Sugiere el vehículo más adecuado para atender una solicitud de viaje.
   * Criterio principal: cercanía al origen. Devuelve ranking y justificación.
   */
  async suggestDispatch(
    tripRequest: DispatchTripRequestInput,
    vehicles: DispatchVehicleInput[]
  ): Promise<DispatchSuggestion> {
    // Ranking determinista por distancia (siempre disponible, incluso con IA)
    const ranked = this.rankByDistance(tripRequest, vehicles);

    if (!this.apiKey || vehicles.length === 0) {
      const best = ranked[0];
      return {
        recommendedVehicleId: best?.vehicleId ?? vehicles[0]?.vehicleId,
        reason: this.apiKey
          ? 'Sin API key de Gemini: sugerencia por cercanía (Haversine).'
          : 'Sin vehículos candidatos disponibles.',
        rankedVehicles: ranked,
        source: 'heuristic',
      };
    }

    // Intento con IA: alimenta al modelo con el ranking y pide justificación
    try {
      const prompt = this.buildDispatchPrompt(tripRequest, ranked);
      const result = await this.generateContent(prompt, {
        temperature: 0.2,
        maxOutputTokens: 512,
      });

      const parsed = this.parseDispatchResponse(result.text, ranked);
      return { ...parsed, source: 'ai', model: result.model };
    } catch (err) {
      this.logger.warn(
        `suggestDispatch: IA falló, usando heurística. ${err instanceof Error ? err.message : err}`
      );
      const best = ranked[0];
      return {
        recommendedVehicleId: best.vehicleId,
        reason: 'IA no disponible: sugerencia por cercanía (Haversine).',
        rankedVehicles: ranked,
        source: 'heuristic',
      };
    }
  }

  /** Distancia Haversine en metros entre dos puntos lat/lng. */
  private haversineMeters(
    lat1: number, lng1: number, lat2: number, lng2: number
  ): number {
    const R = 6371000; // radio terrestre en metros
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)));
  }

  /** Ordena vehículos por distancia al origen del viaje (ascendente). */
  private rankByDistance(
    tripRequest: DispatchTripRequestInput,
    vehicles: DispatchVehicleInput[]
  ): { vehicleId: number; distanceMeters?: number; score?: number }[] {
    const { originLat, originLng } = tripRequest;
    const canCompute = originLat != null && originLng != null;

    return vehicles
      .map((v) => {
        let distanceMeters: number | undefined;
        let score: number | undefined;
        if (canCompute && v.currentLatitude != null && v.currentLongitude != null) {
          distanceMeters = this.haversineMeters(
            originLat!, originLng!, v.currentLatitude, v.currentLongitude
          );
          // score inverso a la distancia (más cerca = mayor score)
          score = distanceMeters > 0 ? 1 / distanceMeters : 1;
        }
        return { vehicleId: v.vehicleId, distanceMeters, score };
      })
      .sort((a, b) => {
        if (a.distanceMeters == null) return 1;
        if (b.distanceMeters == null) return -1;
        return a.distanceMeters - b.distanceMeters;
      });
  }

  private buildDispatchPrompt(
    tripRequest: DispatchTripRequestInput,
    ranked: { vehicleId: number; distanceMeters?: number }[]
  ): string {
    const origin =
      tripRequest.originAddress ??
      `${tripRequest.originLat ?? '?'},${tripRequest.originLng ?? '?'}`;
    const destination =
      tripRequest.destinationAddress ??
      `${tripRequest.destinationLat ?? '?'},${tripRequest.destinationLng ?? '?'}`;

    const candidates = ranked
      .map(
        (r) =>
          `vehicleId=${r.vehicleId}, distancia_al_origen_m=${r.distanceMeters ?? 'desconocida'}`
      )
      .join('\n');

    return [
      'Eres un asistente de despacho de una flota de taxis.',
      `Solicitud de viaje #${tripRequest.tripRequestId}`,
      `Origen: ${origin}`,
      `Destino: ${destination}`,
      'Candidatos disponibles (ya ordenados por cercanía):',
      candidates,
      '',
      'Responde SOLO en JSON válido con esta forma, sin texto adicional ni markdown:',
      '{"recommendedVehicleId": <number>, "reason": "<texto breve en español>"}',
      'Elige el vehicleId con mejor relación cercanía/disponibilidad.',
    ].join('\n');
  }

  private parseDispatchResponse(
    text: string,
    ranked: { vehicleId: number }[]
  ): Omit<DispatchSuggestion, 'source' | 'model'> {
    const best = ranked[0]?.vehicleId;
    let recommendedVehicleId = best;
    let reason = 'Sugerencia por cercanía al origen.';

    // Extraer el primer objeto JSON {...} que aparezca en la respuesta
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed.recommendedVehicleId === 'number') {
          recommendedVehicleId = parsed.recommendedVehicleId;
        }
        if (typeof parsed.reason === 'string' && parsed.reason.trim()) {
          reason = parsed.reason.trim();
        }
      } catch {
        // JSON inválido: nos quedamos con la heurística
      }
    }

    return {
      recommendedVehicleId: recommendedVehicleId ?? best,
      reason,
      rankedVehicles: ranked,
    };
  }
}

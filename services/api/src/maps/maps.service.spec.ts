import { Test, TestingModule } from '@nestjs/testing';
import { MapsService } from './maps.service';

describe('MapsService (DT3 - Producción de Mapas & Caché)', () => {
  let service: MapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapsService],
    }).compile();

    service = module.get<MapsService>(MapsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe calcular ruta utilizando el fallback Haversine ante fallo del servicio OSRM', async () => {
    // Coordenadas válidas en La Paz (El Prado -> Calacoto)
    const origin = '-16.5000,-68.1300';
    const destination = '-16.5400,-68.0800';

    // Mockeamos el fetch interno para simular rate-limit / caída de OSRM
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Rate limit exceeded (429)'));

    const route = await service.calculateRoute(origin, destination);

    expect(route).toBeDefined();
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.distanceText).toContain('km');
    expect(route.startCoords).toBe(origin);
    expect(route.endCoords).toBe(destination);
  });

  it('debe devolver resultado desde la caché en la segunda llamada idéntica', async () => {
    const origin = '-16.5000,-68.1300';
    const destination = '-16.5400,-68.0800';

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [{ distance: 8500, duration: 900, geometry: 'abc_polyline' }],
      }),
    } as any);

    const first = await service.calculateRoute(origin, destination);
    expect(first.distanceMeters).toBe(8500);

    // Segunda llamada debe salir de la caché sin invocar fetch
    const second = await service.calculateRoute(origin, destination);
    expect(second.distanceMeters).toBe(8500);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

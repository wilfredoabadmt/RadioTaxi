export function pointInPolygon(lat: number, lng: number, polygonCoordinates: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygonCoordinates.length - 1; i < polygonCoordinates.length; j = i++) {
    const xi = polygonCoordinates[i][1];
    const yi = polygonCoordinates[i][0];
    const xj = polygonCoordinates[j][1];
    const yj = polygonCoordinates[j][0];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi);

    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

export function parseGeoJsonPolygon(areaGeoJson: string): number[][] | null {
  try {
    const geojson = JSON.parse(areaGeoJson);
    if (geojson.type === 'Polygon' && Array.isArray(geojson.coordinates)) {
      return geojson.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
    }
    if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
      return geojson.geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
    }
  } catch {
    return null;
  }
  return null;
}

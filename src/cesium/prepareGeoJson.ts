interface Geometry {
  type: string;
  coordinates?: unknown;
  geometries?: Geometry[];
}
interface Feature {
  type: string;
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry: Geometry | null;
}
interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
  crs?: { properties?: { name?: string } };
}

// Transform a private copy, retaining vertices, ring order and all attributes.
export function prepareGeoJson(data: unknown, namespace: string, ignoreAltitude = false, uniqueFeatureIds = false): FeatureCollection {
  const copy = structuredClone(data) as FeatureCollection;
  if (copy?.type !== "FeatureCollection" || !Array.isArray(copy.features)) throw new Error("Expected a GeoJSON FeatureCollection.");
  const crs = copy.crs?.properties?.name;
  if (crs && !/CRS84$|EPSG(?::|::|\/)(?:4326)$|EPSG\/0\/4326$/i.test(crs)) throw new Error("GeoJSON deve usar CRS84/WGS84; reprojete a fonte antes de publicar.");
  function validateCoordinates(value: unknown): void {
    if (!Array.isArray(value)) throw new Error("Coordenadas GeoJSON inválidas.");
    if (typeof value[0] === "number") {
      const [longitude, latitude] = value;
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) throw new Error("GeoJSON exige longitude/latitude WGS84, sem reprojeção no navegador.");
    } else value.forEach(validateCoordinates);
  }
  function validateGeometry(geometry: Geometry | null): void {
    if (!geometry) return;
    if (geometry.coordinates) validateCoordinates(geometry.coordinates);
    geometry.geometries?.forEach(validateGeometry);
  }
  function coordinates(value: unknown): unknown {
    if (!Array.isArray(value)) return value;
    return typeof value[0] === "number" ? value.slice(0, 2) : value.map(coordinates);
  }
  function flatten(geometry: Geometry | null) {
    if (!geometry) return;
    if (geometry.coordinates) geometry.coordinates = coordinates(geometry.coordinates);
    geometry.geometries?.forEach(flatten);
  }
  copy.features.forEach((feature, index) => {
    validateGeometry(feature.geometry);
    if (uniqueFeatureIds) feature.id = `${namespace}:${index}`;
    if (ignoreAltitude) flatten(feature.geometry);
  });
  return copy;
}

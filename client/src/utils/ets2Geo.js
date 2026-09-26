/**
 * Conversão oficial de Coordenadas do Euro Truck Simulator 2 para WGS84 Geo (Lon, Lat).
 * Baseado no algoritmo de projeção Mercator de @truckermudgeon e TruckNav-Sim.
 */
const MERCATOR_R = 300000.0;

export function convertEts2ToGeo(gameX, gameZ) {
  if (typeof gameX !== 'number' || typeof gameZ !== 'number' || !isFinite(gameX) || !isFinite(gameZ)) {
    return [0, 0];
  }
  const lon = (gameX / MERCATOR_R) * (180.0 / Math.PI);
  const y_merc = -gameZ / MERCATOR_R;
  const latRad = 2.0 * Math.atan(Math.exp(y_merc)) - Math.PI / 2.0;
  const lat = latRad * (180.0 / Math.PI);
  return [lon, lat]; // [longitude, latitude] para MapLibre GeoJSON
}

export function convertGeoToEts2(lng, lat) {
  const gameX = lng * (Math.PI / 180.0) * MERCATOR_R;
  const latRad = lat * (Math.PI / 180.0);
  const y_merc = Math.log(Math.tan((latRad + Math.PI / 2.0) / 2.0));
  const gameZ = -y_merc * MERCATOR_R;
  return [gameX, gameZ];
}

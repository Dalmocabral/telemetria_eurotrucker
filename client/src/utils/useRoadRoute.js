import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook para gerenciamento e cálculo da rota rodoviária oficial do ETS2.
 * Comunica-se com o backend Python via /api/route de forma assíncrona,
 * detecta mudanças de destino e desvios de rota sem travar o mapa ou o loop de telemetria.
 */
export function useRoadRoute(placement, job, enabled = true) {
  const [routeGeoJson, setRouteGeoJson] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [destinationInfo, setDestinationInfo] = useState(null);
  const [maneuvers, setManeuvers] = useState([]);
  const [routeStatus, setRouteStatus] = useState('idle'); // 'idle' | 'loading' | 'active' | 'error'
  const [routeError, setRouteError] = useState(null);

  // Armazena a última rota e último destino roteado
  const lastRoutedDestKeyRef = useRef('');
  const lastCalculationTimeRef = useRef(0);
  const isCalculatingRef = useRef(false);
  const offRouteCountRef = useRef(0);

  // Lógica inteligente de estágio do frete:
  // Se está em frete (onJob) e a carga NÃO está carregada (ou sem reboque engatado), rota vai para a fábrica de COLETA.
  // Assim que a carga for engatada/carregada, a rota muda para a entrega final.
  const isOnJob = !!job?.onJob;
  const isCargoLoaded = !!job?.isCargoLoaded;
  const hasSource = Boolean(job?.citySource || job?.citySourceId || job?.companySource || job?.companySourceId);
  const isGoingToPickup = isOnJob && !isCargoLoaded && hasSource;

  const targetCity = isGoingToPickup ? (job?.citySource || job?.citySourceId) : (job?.cityDestination || job?.cityDestinationId || job?.cityDst);
  const targetCityId = isGoingToPickup ? (job?.citySourceId || '') : (job?.cityDestinationId || job?.cityDstId || '');
  const targetCompany = isGoingToPickup ? (job?.companySource || job?.companySourceId) : (job?.companyDestination || job?.companyDestinationId || job?.compDst);
  const targetCompanyId = isGoingToPickup ? (job?.companySourceId || '') : (job?.companyDestinationId || job?.compDstId || '');

  const truckX = placement?.x || 0;
  const truckZ = placement?.z || 0;

  const stageTag = isGoingToPickup ? 'PICKUP' : 'DELIVERY';
  const currentDestKey = `${stageTag}::${targetCityId || targetCity || ''}::${targetCompanyId || targetCompany || ''}`;

  const fetchRoute = useCallback(async (force = false) => {
    if (!enabled) return;
    if (!truckX && !truckZ) return;
    if (!targetCity && !targetCityId) {
      setRouteGeoJson(null);
      setRouteStats(null);
      setDestinationInfo(null);
      setManeuvers([]);
      setRouteStatus('idle');
      setRouteError(null);
      lastRoutedDestKeyRef.current = '';
      return;
    }

    const now = Date.now();
    // Throttle: não executa mais de 1 cálculo a cada 3 segundos
    if (!force && now - lastCalculationTimeRef.current < 3000) {
      return;
    }
    if (isCalculatingRef.current) return;

    isCalculatingRef.current = true;
    lastCalculationTimeRef.current = now;
    setRouteStatus('loading');
    setRouteError(null);

    try {
      const host = window.location.hostname || 'localhost';
      const protocol = window.location.protocol;
      const isHttps = protocol === 'https:';
      const defaultPort = isHttps ? '8443' : '8000';
      const port = (window.location.port === '5173') ? defaultPort : (window.location.port || defaultPort);
      
      const queryParams = new URLSearchParams({
        start_x: truckX.toString(),
        start_z: truckZ.toString(),
        city_dst_id: targetCityId || '',
        city_dst: targetCity || '',
        comp_dst_id: targetCompanyId || '',
        comp_dst: targetCompany || '',
      });

      const res = await fetch(`${protocol}//${host}:${port}/api/route?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Servidor retornou status HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.geojson) {
        setRouteGeoJson(data.geojson);
        setRouteStats({
          distance_meters: data.distance_meters,
          distance_km: data.distance_km,
          point_count: data.point_count,
        });
        const enrichedDest = {
          ...data.destination,
          isPickup: isGoingToPickup,
          taskTitle: isGoingToPickup ? 'Coleta da Carga' : 'Destino da Entrega',
        };
        setDestinationInfo(enrichedDest);
        setManeuvers(data.maneuvers || []);
        setRouteStatus('active');
        setRouteError(null);
        lastRoutedDestKeyRef.current = currentDestKey;
        offRouteCountRef.current = 0;
      } else {
        setRouteGeoJson(null);
        setRouteStats(null);
        setManeuvers([]);
        setRouteStatus('error');
        setRouteError(data.message || 'Não foi possível traçar uma rota por rodovias.');
        if (data.destination) {
          setDestinationInfo({
            ...data.destination,
            isPickup: isGoingToPickup,
            taskTitle: isGoingToPickup ? 'Coleta da Carga' : 'Destino da Entrega',
          });
        }
      }
    } catch (err) {
      console.warn('[useRoadRoute] Erro na busca de rota:', err);
      setRouteStatus('error');
      setRouteError('Falha de conexão com o servidor de roteamento.');
    } finally {
      isCalculatingRef.current = false;
    }
  }, [enabled, truckX, truckZ, targetCity, targetCityId, targetCompany, targetCompanyId, isGoingToPickup, currentDestKey]);

  // 1. Detecta mudança de destino
  useEffect(() => {
    if (!enabled) return;
    if (!targetCity && !targetCityId) {
      setRouteGeoJson(null);
      setDestinationInfo(null);
      setRouteStatus('idle');
      return;
    }

    if (currentDestKey !== lastRoutedDestKeyRef.current) {
      fetchRoute(true);
    }
  }, [enabled, currentDestKey, targetCity, targetCityId, fetchRoute]);

  // 2. Verificação periódica de desvio acentuado da rota (off-route detection)
  useEffect(() => {
    if (!enabled || !routeGeoJson || routeStatus !== 'active') return;

    // Checa distância do caminhão em relação aos pontos da rota a cada 3 segundos
    const checkInterval = setInterval(() => {
      const coords = routeGeoJson?.geometry?.coordinates;
      if (!coords || coords.length === 0) return;

      // Converte coordenadas do caminhão para Geo aproximado
      const truckLon = (truckX / 300000.0) * (180.0 / Math.PI);
      const yMerc = -truckZ / 300000.0;
      const latRad = 2.0 * Math.atan(Math.exp(yMerc)) - Math.PI / 2.0;
      const truckLat = latRad * (180.0 / Math.PI);

      let minDistanceMeters = Infinity;
      // Amostra pontos da rota para não pesar no navegador
      const sampleStep = Math.max(1, Math.floor(coords.length / 50));
      for (let i = 0; i < coords.length; i += sampleStep) {
        const pt = coords[i];
        const dx = (truckLon - pt[0]) * 72150.0;
        const dy = (truckLat - pt[1]) * 111000.0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistanceMeters) {
          minDistanceMeters = dist;
        }
      }

      // Se estiver a mais de 350 metros de qualquer ponto da rota
      if (minDistanceMeters > 350.0) {
        offRouteCountRef.current += 1;
        if (offRouteCountRef.current >= 3) {
          console.log('[useRoadRoute] Desvio de rota confirmado (>350m). Recalculando...');
          offRouteCountRef.current = 0;
          fetchRoute(true);
        }
      } else {
        offRouteCountRef.current = 0;
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [enabled, routeGeoJson, routeStatus, truckX, truckZ, fetchRoute]);

  return {
    routeGeoJson,
    routeStats,
    destinationInfo,
    maneuvers,
    routeStatus,
    routeError,
    recalculateRoute: () => fetchRoute(true),
  };
}

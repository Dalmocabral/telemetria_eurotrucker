import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Hook para gerenciamento e cálculo da rota rodoviária oficial do ETS2.
 * Comunica-se com o backend Python via /api/route de forma assíncrona,
 * detecta mudanças de destino e desvios de rota em alta velocidade (1-2s),
 * e gerencia rotas alternativas inteligentes estilo Google Maps.
 */
export function useRoadRoute(placement, job, enabled = true) {
  const [routes, setRoutes] = useState([]);
  const [activeRouteId, setActiveRouteId] = useState('primary');
  const [destinationInfo, setDestinationInfo] = useState(null);
  const [routeStatus, setRouteStatus] = useState('idle'); // 'idle' | 'loading' | 'active' | 'error'
  const [routeError, setRouteError] = useState(null);
  const [stageOverride, setStageOverride] = useState(null); // null ('auto') | 'pickup' | 'delivery'

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
  const hasDestination = Boolean(job?.cityDestination || job?.cityDestinationId || job?.cityDst || job?.cityDstId);

  // Prioriza o override manual do jogador se houver, senão segue o ciclo do ETS2
  const isGoingToPickup = stageOverride === 'pickup' 
    ? true 
    : (stageOverride === 'delivery' ? false : (isOnJob && !isCargoLoaded && hasSource));

  const targetCity = isOnJob ? (isGoingToPickup ? (job?.citySource || job?.citySourceId) : (job?.cityDestination || job?.cityDestinationId || job?.cityDst)) : '';
  const targetCityId = isOnJob ? (isGoingToPickup ? (job?.citySourceId || '') : (job?.cityDestinationId || job?.cityDstId || '')) : '';
  const targetCompany = isOnJob ? (isGoingToPickup ? (job?.companySource || job?.companySourceId) : (job?.companyDestination || job?.companyDestinationId || job?.compDst)) : '';
  const targetCompanyId = isOnJob ? (isGoingToPickup ? (job?.companySourceId || '') : (job?.companyDestinationId || job?.compDstId || '')) : '';

  const truckX = placement?.x || 0;
  const truckZ = placement?.z || 0;

  const stageTag = isGoingToPickup ? 'PICKUP' : 'DELIVERY';
  const currentDestKey = `${stageTag}::${targetCityId || targetCity || ''}::${targetCompanyId || targetCompany || ''}`;

  const fetchRoute = useCallback(async (force = false) => {
    if (!enabled) return;
    if (!truckX && !truckZ) return;
    if (!targetCity && !targetCityId) {
      setRoutes([]);
      setDestinationInfo(null);
      setRouteStatus('idle');
      setRouteError(null);
      lastRoutedDestKeyRef.current = '';
      return;
    }

    const now = Date.now();
    // Throttle reduzido para 1200ms para resposta rápida, mas protegendo de spam
    if (!force && now - lastCalculationTimeRef.current < 1200) {
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
      if (data.success && (data.geojson || (data.routes && data.routes.length > 0))) {
        const enrichedDest = {
          ...data.destination,
          isPickup: isGoingToPickup,
          taskTitle: isGoingToPickup ? 'Coleta da Carga' : 'Destino da Entrega',
        };
        setDestinationInfo(enrichedDest);

        // Prepara lista de rotas (suporte a múltiplas rotas estilo Google Maps)
        const incomingRoutes = data.routes && data.routes.length > 0 
          ? data.routes 
          : [{
              id: 'primary',
              name: 'Mais rápida',
              distance_meters: data.distance_meters,
              distance_km: data.distance_km,
              point_count: data.point_count,
              geojson: data.geojson,
              maneuvers: data.maneuvers || [],
              diff_km: '0 km',
              diff_minutes: '0 min',
              is_fastest: true,
            }];

        setRoutes(incomingRoutes);
        
        // Se a rota ativa anterior ainda existir na resposta, mantém ela; senão volta para 'primary'
        setActiveRouteId(prevId => {
          return incomingRoutes.some(r => r.id === prevId) ? prevId : 'primary';
        });

        setRouteStatus('active');
        setRouteError(null);
        lastRoutedDestKeyRef.current = currentDestKey;
        offRouteCountRef.current = 0;
      } else {
        setRoutes([]);
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
      setRoutes([]);
      setDestinationInfo(null);
      setRouteStatus('idle');
      return;
    }

    if (currentDestKey !== lastRoutedDestKeyRef.current) {
      fetchRoute(true);
    }
  }, [enabled, currentDestKey, targetCity, targetCityId, fetchRoute]);

  // Rota ativa atual (selecionada) e rota alternativa
  const activeRoute = useMemo(() => {
    return routes.find(r => r.id === activeRouteId) || routes[0] || null;
  }, [routes, activeRouteId]);

  const alternativeRoute = useMemo(() => {
    return routes.find(r => r.id !== activeRoute?.id) || null;
  }, [routes, activeRoute]);

  const routeGeoJson = activeRoute?.geojson || null;
  const alternativeGeoJson = alternativeRoute?.geojson || null;

  const routeStats = useMemo(() => {
    if (!activeRoute) return null;
    return {
      distance_meters: activeRoute.distance_meters,
      distance_km: activeRoute.distance_km,
      eta_minutes: activeRoute.eta_minutes,
      eta_formatted: activeRoute.eta_formatted,
      diff_km: activeRoute.diff_km,
      diff_minutes: activeRoute.diff_minutes,
      point_count: activeRoute.point_count || activeRoute.geojson?.geometry?.coordinates?.length || 0,
    };
  }, [activeRoute]);

  const maneuvers = useMemo(() => {
    return activeRoute?.maneuvers || [];
  }, [activeRoute]);

  // 2. Verificação periódica de desvio da rota (recálculo dinâmico em 1 a 2 segundos)
  useEffect(() => {
    if (!enabled || !routeGeoJson || routeStatus !== 'active') return;

    // Checa a cada 1000ms (1 segundo) para resposta instantânea ao volante
    const checkInterval = setInterval(() => {
      const coords = routeGeoJson?.geometry?.coordinates;
      if (!coords || coords.length === 0) return;

      // Converte coordenadas do caminhão para Geo aproximado
      const truckLon = (truckX / 300000.0) * (180.0 / Math.PI);
      const yMerc = -truckZ / 300000.0;
      const latRad = 2.0 * Math.atan(Math.exp(yMerc)) - Math.PI / 2.0;
      const truckLat = latRad * (180.0 / Math.PI);

      let minDistanceMeters = Infinity;
      // Amostra pontos da rota
      const sampleStep = Math.max(1, Math.floor(coords.length / 60));
      for (let i = 0; i < coords.length; i += sampleStep) {
        const pt = coords[i];
        const dx = (truckLon - pt[0]) * 72150.0;
        const dy = (truckLat - pt[1]) * 111000.0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistanceMeters) {
          minDistanceMeters = dist;
        }
      }

      // Detecção ultrarrápida de desvio:
      // Se estiver a mais de 180m por 2 checagens consecutivas (2s), ou > 320m de imediato
      if (minDistanceMeters > 180.0) {
        offRouteCountRef.current += 1;
        if (offRouteCountRef.current >= 2 || minDistanceMeters > 320.0) {
          console.log(`[useRoadRoute] Desvio detectado (${Math.round(minDistanceMeters)}m). Recalculando rota...`);
          offRouteCountRef.current = 0;
          fetchRoute(true);
        }
      } else {
        offRouteCountRef.current = 0;
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [enabled, routeGeoJson, routeStatus, truckX, truckZ, fetchRoute]);

  const selectRoute = useCallback((routeId) => {
    if (routes.some(r => r.id === routeId)) {
      setActiveRouteId(routeId);
    }
  }, [routes]);

  return {
    routes,
    activeRouteId,
    activeRoute,
    alternativeRoute,
    selectRoute,
    routeGeoJson,
    alternativeGeoJson,
    routeStats,
    destinationInfo,
    maneuvers,
    routeStatus,
    routeError,
    recalculateRoute: () => fetchRoute(true),
    isGoingToPickup,
    canToggleStage: isOnJob && hasSource && hasDestination,
    toggleStage: () => {
      setStageOverride(prev => {
        const next = (prev === 'pickup') ? 'delivery' : (prev === 'delivery' ? 'pickup' : (isGoingToPickup ? 'delivery' : 'pickup'));
        return next;
      });
      lastRoutedDestKeyRef.current = '';
    },
    setStage: (stage) => {
      setStageOverride(stage);
      lastRoutedDestKeyRef.current = '';
    },
  };
}

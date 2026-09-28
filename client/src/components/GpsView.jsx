import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol, PMTiles } from 'pmtiles';
import { BlobSource } from '../utils/BlobSource';
import { 
  Crosshair, ZoomIn, ZoomOut, 
  ArrowUp, ArrowUpRight, ArrowRight, ArrowUpLeft, ArrowLeft,
  CornerDownRight, CornerDownLeft, RotateCcw, Route,
  Volume2, VolumeX, ShieldAlert,
  Flag, Fuel, Moon, Clock, ChevronLeft,
  Camera, Zap, Layers, Info, X, RefreshCw
} from 'lucide-react';
import { wakeLockManager } from '../utils/wakeLock';
import { convertEts2ToGeo } from '../utils/ets2Geo';
import { ETS2_SPEED_CAMERAS } from '../data/ets2_pois';
import { ETS2_ALL_CITIES } from '../data/ets2_cities_full';
import { useRoadRoute } from '../utils/useRoadRoute';

// Configuração do Worker URL e do Protocolo PMTiles
if (typeof maplibregl.setWorkerUrl === 'function') {
  maplibregl.setWorkerUrl('/assets/maplibre-gl-worker.mjs');
}

let pmtilesProtocol = null;
function getPmtilesProtocol() {
  if (!pmtilesProtocol) {
    pmtilesProtocol = new Protocol();
    maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);
  }
  return pmtilesProtocol;
}

function renderManeuverIcon(iconName, color = '#ffffff') {
  const props = { size: 36, color: '#ffffff', strokeWidth: 2.6 };
  switch (iconName) {
    case 'ArrowUp': return <ArrowUp {...props} />;
    case 'ArrowUpRight': return <ArrowUpRight {...props} />;
    case 'ArrowRight': return <ArrowRight {...props} />;
    case 'CornerDownRight': return <CornerDownRight {...props} />;
    case 'ArrowUpLeft': return <ArrowUpLeft {...props} />;
    case 'ArrowLeft': return <ArrowLeft {...props} />;
    case 'CornerDownLeft': return <CornerDownLeft {...props} />;
    case 'RotateCcw': return <RotateCcw {...props} />;
    case 'Flag': return <Flag {...props} />;
    case 'ShieldAlert': return <ShieldAlert {...props} />;
    default: return <ArrowUp {...props} />;
  }
}

// Função auxiliar para cálculo métrico real entre dois pontos Geo
function calcDistMeters(p1, p2) {
  if (!p1 || !p2) return 0;
  const dx = (p1[0] - p2[0]) * 72150.0;
  const dy = (p1[1] - p2[1]) * 111000.0;
  return Math.hypot(dx, dy);
}

export default function GpsView({ data, isEmbedded = false }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerElRef = useRef(null);

  // Estados de navegação
  const [navMode, setNavMode] = useState('heading-up'); // 'heading-up' (3D) | 'north-up' (2D)
  const [followTruck, setFollowTruck] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Estado do Wake Lock honesto
  const [wakeLockInfo, setWakeLockInfo] = useState(() => wakeLockManager.getStateInfo());
  const [isWakeModalOpen, setIsWakeModalOpen] = useState(false);

  // Alerta antecipado de radar (com contagem regressiva em metros)
  const [approachingRadar, setApproachingRadar] = useState(null);

  // Refs de posição, rotação e suavização 60 FPS
  const targetPosRef = useRef(null); // [lon, lat]
  const currentPosRef = useRef([-1.096, -5.558]); // [lon, lat]
  const targetHeadingRef = useRef(0);
  const currentHeadingRef = useRef(0);
  const breadcrumbsRef = useRef([]); // [[lon, lat], ...]
  const animFrameIdRef = useRef(null);
  const lastRadarAlertIdRef = useRef('');
  const lastRadarAlertTimeRef = useRef(0);
  const lastSpokenManeuverStageRef = useRef('');

  const truck = data?.truck || {};
  const placement = data?.placement || { x: -28842.0, z: 4982.0, heading: 0 };
  const nav = data?.navigation || {};
  const game = data?.game || {};
  const job = data?.job || {};

  const speed = truck.speed || 0;
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > (speedLimit + 2);

  // 1. Hook de Roteamento Rodoviário Oficial do ETS2
  const {
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
    recalculateRoute,
    isGoingToPickup,
    canToggleStage,
    toggleStage,
  } = useRoadRoute(placement, job, true);

  // 1.1 Cálculo Dinâmico da Próxima Curva e Distância em Tempo Real (Turn-by-Turn estilo Waze/Google Maps)
  const activeManeuver = useMemo(() => {
    if (routeStatus === 'loading') {
      return {
        type: 'loading',
        iconName: 'RotateCcw',
        instruction: 'Calculando rota pelas rodovias...',
        turnText: 'Calculando...',
        subText: destinationInfo?.name ? `${destinationInfo.taskTitle || 'Destino'}: ${destinationInfo.name}` : 'Consultando malha viária',
        distanceText: '...',
        distanceMeters: 0,
        color: '#38bdf8',
      };
    }

    if (!job?.onJob || routeStatus === 'idle') {
      return {
        type: 'straight',
        iconName: 'ArrowUp',
        instruction: 'Siga pelas rodovias',
        turnText: 'Siga em frente',
        subText: 'Navegação rodoviária livre',
        distanceText: '--',
        distanceMeters: 0,
        color: '#00e5ff',
      };
    }

    if (routeStatus === 'error') {
      return {
        type: 'error',
        iconName: 'ShieldAlert',
        instruction: 'Rota rodoviária indisponível',
        turnText: 'Sem rota',
        subText: routeError || 'Verifique se a rodovia está mapeada',
        distanceText: nav?.distance ? `${nav.distance} km` : 'Sem rota',
        distanceMeters: 0,
        color: '#ef4444',
      };
    }

    const coords = routeGeoJson?.geometry?.coordinates;
    const truckGeo = convertEts2ToGeo(placement.x, placement.z);

    if (!coords || coords.length === 0 || !maneuvers || maneuvers.length === 0) {
      return {
        type: 'straight',
        iconName: 'ArrowUp',
        instruction: destinationInfo ? `Siga para ${destinationInfo.name}` : 'Siga pelas rodovias',
        turnText: 'Siga em frente',
        subText: destinationInfo?.description || destinationInfo?.name || 'Navegação rodoviária',
        distanceText: routeStats?.distance_km ? `${routeStats.distance_km} km` : (nav?.distance ? `${nav.distance} km` : '--'),
        distanceMeters: 0,
        color: '#00e5ff',
      };
    }

    // 1. Encontra o índice da coordenada mais próxima do caminhão ao longo da rota
    let closestIdx = 0;
    let minD = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = calcDistMeters(truckGeo, coords[i]);
      if (d < minD) {
        minD = d;
        closestIdx = i;
      }
    }

    // 2. Localiza a próxima manobra que ainda está à frente do caminhão
    let nextM = null;
    let mIdx = -1;
    for (let i = 0; i < maneuvers.length; i++) {
      const m = maneuvers[i];
      const targetIdx = typeof m.coord_index === 'number' ? m.coord_index : 0;
      // Se a manobra está à frente (ou estamos a menos de 25m do ápice mas ainda não passamos o índice + 2)
      if (targetIdx > closestIdx + 1 || (targetIdx >= closestIdx && m.type === 'destination')) {
        nextM = m;
        mIdx = i;
        break;
      }
    }

    if (!nextM) {
      nextM = maneuvers[maneuvers.length - 1]; // Destino final
    }

    // 3. Calcula a distância real em metros percorrendo os nós da estrada
    const targetIdx = typeof nextM.coord_index === 'number' ? nextM.coord_index : coords.length - 1;
    let distAlongRoute = calcDistMeters(truckGeo, coords[closestIdx]);
    const startStep = Math.min(closestIdx, targetIdx);
    const endStep = Math.max(closestIdx, targetIdx);
    for (let i = startStep; i < endStep && i < coords.length - 1; i++) {
      distAlongRoute += calcDistMeters(coords[i], coords[i + 1]);
    }

    // 4. Formatação precisa da distância (ex: 350 m ou 1.2 km)
    let distanceText = '';
    if (distAlongRoute < 950) {
      const roundedMeters = distAlongRoute > 100 
        ? Math.round(distAlongRoute / 20) * 20 
        : Math.max(10, Math.round(distAlongRoute / 10) * 10);
      distanceText = `${roundedMeters} m`;
    } else {
      distanceText = `${(distAlongRoute / 1000).toFixed(1)} km`;
    }

    let iconName = 'ArrowUp';
    let color = '#10b981';

    if (nextM.type === 'right') { iconName = 'ArrowRight'; color = '#38bdf8'; }
    else if (nextM.type === 'left') { iconName = 'ArrowLeft'; color = '#38bdf8'; }
    else if (nextM.type === 'slight-right') { iconName = 'ArrowUpRight'; color = '#00e5ff'; }
    else if (nextM.type === 'slight-left') { iconName = 'ArrowUpLeft'; color = '#00e5ff'; }
    else if (nextM.type === 'sharp-right') { iconName = 'CornerDownRight'; color = '#f59e0b'; }
    else if (nextM.type === 'sharp-left') { iconName = 'CornerDownLeft'; color = '#f59e0b'; }
    else if (nextM.type === 'destination') { iconName = 'Flag'; color = '#10b981'; }

    return {
      type: nextM.type,
      iconName,
      instruction: nextM.turn_text || nextM.instruction || 'Siga pela rodovia',
      turnText: nextM.turn_text || nextM.instruction,
      subText: destinationInfo?.description || destinationInfo?.name || 'Siga pela rodovia',
      distanceText,
      distanceMeters: Math.round(distAlongRoute),
      coord_index: nextM.coord_index,
      point: nextM.point,
      color,
    };
  }, [routeStatus, routeError, routeGeoJson, maneuvers, destinationInfo, routeStats, nav?.distance, placement.x, placement.z]);

  // 2. Inscrição unificada no WakeLockManager
  useEffect(() => {
    const unsubscribe = wakeLockManager.subscribe((info) => {
      setWakeLockInfo(info);
    });
    return () => unsubscribe();
  }, []);

  // 3. Síntese de voz em Português (Exclusivo para avisos de radares e navegação)
  const speakVoice = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const brVoice = voices.find(v => v.lang === 'pt-BR' || v.lang.startsWith('pt')) || voices.find(v => v.lang.includes('pt'));
      if (brVoice) utterance.voice = brVoice;
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('Speech error:', err);
        }
      }, 25);
    } catch (e) {
      console.warn('Erro de voz:', e);
    }
  }, [voiceEnabled]);

  // Desbloqueio de áudio em navegadores móveis (Chrome / Edge / Android)
  useEffect(() => {
    const unlockAudio = () => {
      if (window.speechSynthesis) {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        const silent = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(silent);
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Enquadrar a rota rodoviária completa (incluindo rotas alternativas) até o destino
  const fitRouteToBounds = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const coords = routeGeoJson?.geometry?.coordinates;
    const altCoords = alternativeGeoJson?.geometry?.coordinates;
    if (coords && coords.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      // Amostra pontos da rota ativa para enquadrar
      const step = Math.max(1, Math.floor(coords.length / 50));
      for (let i = 0; i < coords.length; i += step) {
        bounds.extend(coords[i]);
      }
      bounds.extend(coords[coords.length - 1]);

      // Amostra também a rota alternativa se houver
      if (altCoords && altCoords.length > 1) {
        const altStep = Math.max(1, Math.floor(altCoords.length / 50));
        for (let j = 0; j < altCoords.length; j += altStep) {
          bounds.extend(altCoords[j]);
        }
      }

      if (currentPosRef.current) {
        bounds.extend(currentPosRef.current);
      }
      setFollowTruck(false);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: { top: 130, bottom: 120, left: 80, right: 80 },
        duration: 1000,
        pitch: 0,
      });
      speakVoice(`Exibindo rota rodoviária completa até ${destinationInfo?.name || 'o destino'}.`);
    } else if (destinationInfo?.coordinates && currentPosRef.current) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(currentPosRef.current);
      bounds.extend(destinationInfo.coordinates);
      setFollowTruck(false);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: { top: 120, bottom: 90, left: 70, right: 70 },
        duration: 1000,
        pitch: 0,
      });
    }
  }, [routeGeoJson, alternativeGeoJson, destinationInfo, speakVoice]);

  // 4. Detecção em Tempo Real de Radares com Localização Exata e Status "Ultrapassado"
  const passedRadarTimerRef = useRef(null);
  const minObservedRadarDistRef = useRef(Infinity);

  useEffect(() => {
    if (!placement.x && !placement.z) return;
    if (placement.x === 0 && placement.z === 0) return;

    let nearestRadar = null;
    let minDistance = Infinity;

    // Converte heading (graus) para vetor unitário do caminhão (+x leste, -z norte na trigonometria ETS2)
    const headingRad = ((placement.heading || 0) * Math.PI) / 180.0;
    const truckDirX = Math.sin(headingRad);
    const truckDirZ = -Math.cos(headingRad);

    for (const cam of ETS2_SPEED_CAMERAS) {
      const dx = cam.x - placement.x;
      const dz = cam.z - placement.z;
      const distMeters = Math.hypot(dx, dz);

      // Produto escalar para verificar se o radar está à frente ou atrás do caminhão
      const dotAhead = dx * truckDirX + dz * truckDirZ;

      if (distMeters < minDistance) {
        minDistance = distMeters;
        nearestRadar = { ...cam, distance: Math.round(distMeters), isAhead: dotAhead > -25.0 };
      }
    }

    if (nearestRadar && minDistance <= 650) {
      // Se estava se aproximando e agora passou para trás do caminhão (dotAhead negativo ou distância começou a aumentar)
      if (minObservedRadarDistRef.current < 250 && (!nearestRadar.isAhead || minDistance > minObservedRadarDistRef.current + 35)) {
        if (!approachingRadar?.passed) {
          setApproachingRadar({ ...nearestRadar, passed: true });
          speakVoice("Radar ultrapassado.");
          if (passedRadarTimerRef.current) clearTimeout(passedRadarTimerRef.current);
          passedRadarTimerRef.current = setTimeout(() => {
            setApproachingRadar(null);
            minObservedRadarDistRef.current = Infinity;
          }, 3000);
        }
        return;
      }

      minObservedRadarDistRef.current = Math.min(minObservedRadarDistRef.current, minDistance);
      setApproachingRadar(nearestRadar);

      const now = Date.now();
      if (nearestRadar.id !== lastRadarAlertIdRef.current || (now - lastRadarAlertTimeRef.current > 16000)) {
        lastRadarAlertIdRef.current = nearestRadar.id;
        lastRadarAlertTimeRef.current = now;
        speakVoice(`Atenção: radar de velocidade à frente a ${nearestRadar.distance} metros. Limite de ${nearestRadar.limit} quilômetros por hora.`);
      }
    } else {
      if (!approachingRadar?.passed) {
        setApproachingRadar(null);
        minObservedRadarDistRef.current = Infinity;
      }
    }
  }, [placement.x, placement.z, placement.heading, speakVoice, approachingRadar?.passed]);

  // 5. Inicialização do MapLibre GL com PMTiles Vetoriais do ETS2
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;
    const protocol = getPmtilesProtocol();

    async function setupMapLibre() {
      try {
        const initialGeo = convertEts2ToGeo(placement.x, placement.z);
        currentPosRef.current = [...initialGeo];

        // Carrega os arquivos vetoriais PMTiles na memória via BlobSource
        const [roadsBlob, dataBlob] = await Promise.all([
          fetch('/maps/ets2/map-data/tiles/roads.mp3').then(r => r.blob()),
          fetch('/maps/ets2/map-data/tiles/map-data-combined.mp3').then(r => r.blob()),
        ]);

        if (!isMounted) return;

        const roadsPmtiles = new PMTiles(new BlobSource(roadsBlob, 'roads'));
        const allDataPmtiles = new PMTiles(new BlobSource(dataBlob, 'all-data'));
        protocol.add(roadsPmtiles);
        protocol.add(allDataPmtiles);

        const style = {
          version: 8,
          glyphs: '/glyphs/{fontstack}/{range}.pbf',
          sprite: `${window.location.origin}/sprites/ets2/sprites`,
          sources: {
            'ets2': {
              type: 'vector',
              tiles: ['pmtiles://roads/{z}/{x}/{y}'],
              minzoom: 5,
              maxzoom: 9,
            },
            'all-data': {
              type: 'vector',
              tiles: ['pmtiles://all-data/{z}/{x}/{y}'],
              minzoom: 5,
              maxzoom: 9,
            },
          },
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#080d16' },
            },
            {
              id: 'countries',
              type: 'fill',
              source: 'all-data',
              'source-layer': 'countries',
              paint: {
                'fill-color': '#111827',
                'fill-opacity': 0.95,
              },
            },
            {
              id: 'country-borders',
              type: 'line',
              source: 'all-data',
              'source-layer': 'countries',
              paint: {
                'line-color': '#2a3b52',
                'line-width': 1.8,
                'line-dasharray': [3, 2],
              },
            },
            {
              id: 'water',
              type: 'fill',
              source: 'all-data',
              'source-layer': 'water',
              paint: { 'fill-color': '#060a12' },
            },
            {
              id: 'water-outline',
              type: 'line',
              source: 'all-data',
              'source-layer': 'water',
              paint: {
                'line-color': '#142033',
                'line-width': 2,
              },
            },
            {
              id: 'prefab-zones',
              type: 'fill',
              source: 'all-data',
              'source-layer': 'prefabs',
              paint: {
                'fill-color': '#1e293b',
                'fill-opacity': 0.85,
              },
            },
            {
              id: 'roads-casing',
              type: 'line',
              source: 'ets2',
              'source-layer': 'ets2',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#09101d',
                'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 8, 5.0, 10, 9.0, 13, 15.0],
              },
            },
            {
              id: 'roads',
              type: 'line',
              source: 'ets2',
              'source-layer': 'ets2',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#5a78a2',
                'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.6, 8, 3.5, 10, 6.8, 13, 11.5],
                'line-opacity': 1.0,
              },
            },
          ],
        };

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style,
          center: initialGeo,
          zoom: 9.5,
          minZoom: 4,
          maxZoom: 13,
          pitch: navMode === 'heading-up' ? 58 : 0,
          bearing: navMode === 'heading-up' ? (placement.heading || 0) : 0,
          attributionControl: false,
          maxBounds: [[-35, -28], [35, 30]],
          touchZoomRotate: true,
          touchPitch: true,
          dragRotate: true,
        });

        map.on('error', (e) => {
          console.warn('[MapLibre error]', e.error ? e.error.message : e);
        });

        map.on('load', () => {
          console.log('[MapLibre] Map loaded successfully!');
          if (!isMounted) return;
          map.resize();

          // 1. Rota Alternativa Secundária (Cinza escuro / tracejado estilo Google Maps)
          map.addSource('alternative-route-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          map.addLayer({
            id: 'alternative-route-casing',
            type: 'line',
            source: 'alternative-route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#020617',
              'line-width': ['interpolate', ['linear'], ['zoom'], 5, 4.2, 8, 7.0, 11, 10.5, 14, 15.0],
              'line-opacity': 0.85,
            },
          });

          map.addLayer({
            id: 'alternative-route-core',
            type: 'line',
            source: 'alternative-route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#94a3b8',
              'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 8, 4.5, 11, 6.8, 14, 9.5],
              'line-opacity': 0.95,
              'line-dasharray': [2, 1.2],
            },
          });

          // 1.1 Rota Rodoviária Ativa / Principal (Azul Ciano Neon #00e5ff)
          map.addSource('planned-route-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          map.addLayer({
            id: 'planned-route-casing',
            type: 'line',
            source: 'planned-route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#030816',
              'line-width': ['interpolate', ['linear'], ['zoom'], 5, 5.0, 8, 8.5, 11, 13.0, 14, 18.0],
              'line-opacity': 0.9,
            },
          });

          map.addLayer({
            id: 'planned-route-core',
            type: 'line',
            source: 'planned-route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#00e5ff',
              'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3.2, 8, 5.5, 11, 8.5, 14, 12.0],
              'line-opacity': 0.98,
            },
          });

          // Clique na linha da rota alternativa para ativá-la
          map.on('click', 'alternative-route-core', () => {
            selectRoute('alternative');
            speakVoice('Via alternativa selecionada.');
          });
          map.on('mouseenter', 'alternative-route-core', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'alternative-route-core', () => {
            map.getCanvas().style.cursor = '';
          });

          // 1.2 Seta de Manobra na Pista (Estilo Google Maps / Imagem 2 - Traço Branco com Borda Escura sobre a curva)
          map.addSource('maneuver-turn-arrow-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          map.addLayer({
            id: 'maneuver-turn-arrow-casing',
            type: 'line',
            source: 'maneuver-turn-arrow-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#020617',
              'line-width': ['interpolate', ['linear'], ['zoom'], 5, 8.0, 8, 12.0, 11, 16.0, 14, 22.0],
              'line-opacity': 0.95,
            },
          });

          map.addLayer({
            id: 'maneuver-turn-arrow-core',
            type: 'line',
            source: 'maneuver-turn-arrow-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#ffffff',
              'line-width': ['interpolate', ['linear'], ['zoom'], 5, 5.0, 8, 8.0, 11, 11.5, 14, 16.0],
              'line-opacity': 1.0,
            },
          });

          // 4.1 Marcador Piscante do Radar Ativo à Frente (Ícone e Ponto Exato)
          map.addSource('active-radar-beacon-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          map.addLayer({
            id: 'active-radar-pulse-ring',
            type: 'circle',
            source: 'active-radar-beacon-source',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 18, 11, 30],
              'circle-color': '#ef4444',
              'circle-opacity': 0.35,
              'circle-stroke-color': '#ff1744',
              'circle-stroke-width': 2.0,
            },
          });

          map.addLayer({
            id: 'active-radar-core-point',
            type: 'circle',
            source: 'active-radar-beacon-source',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 7, 11, 12],
              'circle-color': '#ff1744',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2.5,
            },
          });

          map.addLayer({
            id: 'active-radar-label',
            type: 'symbol',
            source: 'active-radar-beacon-source',
            layout: {
              'text-field': ['get', 'title'],
              'text-font': ['Commissioner'],
              'text-size': 13,
              'text-anchor': 'bottom',
              'text-offset': [0, -1.2],
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            },
            paint: {
              'text-color': '#ff1744',
              'text-halo-color': '#020617',
              'text-halo-width': 2.5,
            },
          });

          // 2. Rastro Percorrido pelo Caminhão (Trajeto histórico recente em laranja)
          map.addSource('trail-line-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          map.addLayer({
            id: 'trail-line-layer',
            type: 'line',
            source: 'trail-line-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#f59e0b',
              'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.0, 8, 3.5, 11, 5.0, 14, 7.0],
              'line-opacity': 0.75,
            },
          });

          // 3. Cidades Oficiais do ETS2
          const citiesGeoJson = {
            type: 'FeatureCollection',
            features: ETS2_ALL_CITIES.map(c => ({
              type: 'Feature',
              properties: { name: c.name },
              geometry: { type: 'Point', coordinates: convertEts2ToGeo(c.x, c.z) },
            })),
          };

          map.addSource('cities-source', {
            type: 'geojson',
            data: citiesGeoJson,
          });

          map.addLayer({
            id: 'cities-layer',
            type: 'symbol',
            source: 'cities-source',
            minzoom: 6,
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Commissioner'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 8, 13, 11, 16],
              'text-anchor': 'bottom',
              'text-offset': [0, -0.6],
              'text-allow-overlap': false,
            },
            paint: {
              'text-color': '#f8fafc',
              'text-halo-color': '#020617',
              'text-halo-width': 2.0,
            },
          });

          // 4. Radares de Velocidade Finais (Avisos Visuais)
          map.addSource('radars-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: ETS2_SPEED_CAMERAS.map(cam => ({
                type: 'Feature',
                properties: { limit: cam.limit },
                geometry: { type: 'Point', coordinates: convertEts2ToGeo(cam.x, cam.z) },
              })),
            },
          });

          map.addLayer({
            id: 'radars-layer',
            type: 'circle',
            source: 'radars-source',
            minzoom: 8,
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 11, 7],
              'circle-color': '#ef4444',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            },
          });

          // 5. Destino Final da Entrega / Empresa (Ponto Dourado Pulsante)
          map.addSource('destination-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          map.addLayer({
            id: 'destination-pulse',
            type: 'circle',
            source: 'destination-source',
            paint: {
              'circle-radius': 18,
              'circle-color': '#eab308',
              'circle-opacity': 0.35,
              'circle-stroke-color': '#fde047',
              'circle-stroke-width': 1.5,
            },
          });

          map.addLayer({
            id: 'destination-point',
            type: 'circle',
            source: 'destination-source',
            paint: {
              'circle-radius': 9,
              'circle-color': '#eab308',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2.5,
            },
          });

          map.addLayer({
            id: 'destination-label',
            type: 'symbol',
            source: 'destination-source',
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Commissioner'],
              'text-size': 14,
              'text-anchor': 'bottom',
              'text-offset': [0, -1.0],
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            },
            paint: {
              'text-color': '#fde047',
              'text-halo-color': '#060a12',
              'text-halo-width': 2.5,
            },
          });

          setMapLoaded(true);
        });

        // Marcador 3D do Caminhão
        const markerDiv = document.createElement('div');
        markerDiv.className = 'truck-marker-3d-pin';
        markerDiv.innerHTML = `
          <div id="truck-marker-3d" style="
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0px 4px 10px rgba(0, 229, 255, 0.75)) drop-shadow(0px 2px 4px rgba(0,0,0,0.85));
            transform-origin: 50% 50%;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24">
              <polygon 
                points="12,2 22,22 12,17 2,22" 
                fill="#00e5ff" 
                stroke="#ffffff" 
                stroke-width="2.2" 
                stroke-linejoin="round"
              />
            </svg>
          </div>
        `;

        const marker = new maplibregl.Marker({
          element: markerDiv,
          rotationAlignment: 'viewport',
          pitchAlignment: 'viewport',
        })
          .setLngLat(initialGeo)
          .addTo(map);

        markerElRef.current = marker;
        mapInstanceRef.current = map;
        window.__maplibre_map = map;

        const resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.resize();
          }
        });
        if (mapContainerRef.current) {
          resizeObserver.observe(mapContainerRef.current);
        }

        const handleUserGesture = (e) => {
          // Desativa o travamento de câmera quando o usuário toca, dá zoom com dedos (pinch) ou arrasta o mapa
          if (!e || e.originalEvent) {
            setFollowTruck(false);
          }
        };

        map.on('dragstart', handleUserGesture);
        map.on('zoomstart', handleUserGesture);
        map.on('rotatestart', handleUserGesture);
        map.on('pitchstart', handleUserGesture);
        map.on('touchstart', handleUserGesture);

        // Força resize após pequena espera para garantir layout estabilizado
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.resize();
          }
        }, 100);

      } catch (err) {
        console.error('Erro ao inicializar MapLibre GL:', err);
      }
    }

    setupMapLibre();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 6. Atualização da Rota Ativa no MapLibre GL
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const source = mapInstanceRef.current.getSource('planned-route-source');
    if (source) {
      if (routeGeoJson) {
        source.setData(routeGeoJson);
      } else {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [routeGeoJson, mapLoaded]);

  // 6.1 Atualização da Rota Alternativa no MapLibre GL
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const altSource = mapInstanceRef.current.getSource('alternative-route-source');
    if (altSource) {
      if (alternativeGeoJson) {
        altSource.setData(alternativeGeoJson);
      } else {
        altSource.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [alternativeGeoJson, mapLoaded]);

  // 6.2 Atualização da Seta de Manobra na Pista (desenhada sobre a linha da rota no local da curva)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const arrowSource = mapInstanceRef.current.getSource('maneuver-turn-arrow-source');
    if (arrowSource) {
      const coords = routeGeoJson?.geometry?.coordinates;
      if (
        coords && 
        coords.length > 5 && 
        activeManeuver && 
        activeManeuver.type !== 'destination' && 
        activeManeuver.distanceMeters <= 600 &&
        typeof activeManeuver.coord_index === 'number'
      ) {
        const cIdx = activeManeuver.coord_index;
        const startSlice = Math.max(0, cIdx - 4);
        const endSlice = Math.min(coords.length, cIdx + 5);
        const arrowSlice = coords.slice(startSlice, endSlice);

        if (arrowSlice.length >= 2) {
          arrowSource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { type: activeManeuver.type },
                geometry: {
                  type: 'LineString',
                  coordinates: arrowSlice,
                },
              },
            ],
          });
          return;
        }
      }
      arrowSource.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [routeGeoJson, activeManeuver, mapLoaded]);

  // 6.3 Atualização do Marcador Piscante do Radar no Mapa no Ponto Exato
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const source = mapInstanceRef.current.getSource('active-radar-beacon-source');
    if (source) {
      if (approachingRadar && !approachingRadar.passed) {
        const radarGeo = convertEts2ToGeo(approachingRadar.x, approachingRadar.z);
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                title: `📸 RADAR (${approachingRadar.limit} KM/H)`,
              },
              geometry: {
                type: 'Point',
                coordinates: radarGeo,
              },
            },
          ],
        });
      } else {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [approachingRadar, mapLoaded]);

  // 7. Atualização do Destino e Empresa no MapLibre GL
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const destSource = mapInstanceRef.current.getSource('destination-source');
    if (destSource) {
      if (destinationInfo && destinationInfo.coordinates) {
        const labelText = destinationInfo.is_company 
          ? `🏢 ${destinationInfo.name} (${destinationInfo.city})`
          : `🏁 ${destinationInfo.name}${destinationInfo.is_approximate ? ' (Aprox.)' : ''}`;

        destSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: labelText },
              geometry: {
                type: 'Point',
                coordinates: destinationInfo.coordinates,
              },
            },
          ],
        });
      } else {
        destSource.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [destinationInfo, mapLoaded]);

  // 8. Atualização de Alvos da Telemetria e Rastro Percorrido
  useEffect(() => {
    if (placement.x === 0 && placement.z === 0) return;
    const target = convertEts2ToGeo(placement.x, placement.z);
    targetPosRef.current = target;

    if (typeof placement.heading === 'number' && isFinite(placement.heading)) {
      targetHeadingRef.current = placement.heading;
    }

    // Registra rastro percorrido nas estradas
    const currentBreadcrumbs = breadcrumbsRef.current;
    const lastPoint = currentBreadcrumbs[currentBreadcrumbs.length - 1];
    if (!lastPoint) {
      breadcrumbsRef.current.push(target);
    } else {
      const dLon = target[0] - lastPoint[0];
      const dLat = target[1] - lastPoint[1];
      const dist = Math.hypot(dLon, dLat);

      if (dist > 0.00015 && speed > 2.0) {
        const moveAngle = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
        let diffMove = (moveAngle - targetHeadingRef.current + 540) % 360 - 180;
        if (Math.abs(diffMove) < 70) {
          targetHeadingRef.current = (targetHeadingRef.current + diffMove * 0.35 + 360) % 360;
        }

        breadcrumbsRef.current.push(target);
        if (breadcrumbsRef.current.length > 100) {
          breadcrumbsRef.current.shift();
        }

        if (mapInstanceRef.current && mapLoaded) {
          const trailSource = mapInstanceRef.current.getSource('trail-line-source');
          if (trailSource && breadcrumbsRef.current.length > 1) {
            trailSource.setData({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: breadcrumbsRef.current,
                  },
                },
              ],
            });
          }
        }
      }
    }
  }, [placement.x, placement.z, placement.heading, speed, mapLoaded]);

  // 9. LOOP DE CÂMERA 3D A 60 FPS (LERP + JUMPTO)
  useEffect(() => {
    const renderLoop = () => {
      try {
        if (targetPosRef.current && mapInstanceRef.current && markerElRef.current) {
          const targetLon = targetPosRef.current[0];
          const targetLat = targetPosRef.current[1];

          if (isFinite(targetLon) && isFinite(targetLat)) {
            currentPosRef.current[0] += (targetLon - currentPosRef.current[0]) * 0.18;
            currentPosRef.current[1] += (targetLat - currentPosRef.current[1]) * 0.18;

            const currentPos = [currentPosRef.current[0], currentPosRef.current[1]];
            markerElRef.current.setLngLat(currentPos);

            const targetH = targetHeadingRef.current || 0;
            let diff = (targetH - currentHeadingRef.current + 540) % 360 - 180;
            currentHeadingRef.current = (currentHeadingRef.current + diff * 0.15 + 360) % 360;

            const heading = currentHeadingRef.current;
            const map = mapInstanceRef.current;

            if (followTruck) {
              if (navMode === 'heading-up') {
                map.jumpTo({
                  center: currentPos,
                  bearing: heading,
                  pitch: 58,
                });
                markerElRef.current.setRotation(0);
              } else {
                map.jumpTo({
                  center: currentPos,
                  bearing: 0,
                  pitch: 0,
                });
                markerElRef.current.setRotation(heading);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[MapLibre renderLoop]', err);
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [navMode, followTruck]);

  // Alternar entre Modo Condução 3D e Modo Norte Fixo 2D
  const toggleNavMode = () => {
    const nextMode = navMode === 'heading-up' ? 'north-up' : 'heading-up';
    setNavMode(nextMode);
    setFollowTruck(true);
    if (nextMode === 'heading-up') {
      speakVoice('Navegação 3D em perspectiva ativada.');
    } else {
      speakVoice('Modo norte fixo 2D ativado.');
    }
  };

  // 11. Gatilhos de Voz em Português estilo Waze / Google Maps
  useEffect(() => {
    if (!voiceEnabled || !activeManeuver || routeStatus !== 'active') return;
    const dist = activeManeuver.distanceMeters;
    const mId = `${activeManeuver.coord_index}_${activeManeuver.type}`;
    const instr = activeManeuver.instruction;

    if (activeManeuver.type === 'destination') {
      if (dist <= 600 && dist > 400 && lastSpokenManeuverStageRef.current !== `${mId}_600`) {
        lastSpokenManeuverStageRef.current = `${mId}_600`;
        speakVoice(`A 500 metros, seu destino final.`);
      } else if (dist <= 60 && lastSpokenManeuverStageRef.current !== `${mId}_arrived`) {
        lastSpokenManeuverStageRef.current = `${mId}_arrived`;
        speakVoice(`Você chegou ao seu destino.`);
      }
      return;
    }

    // Pré-aviso a ~500 metros
    if (dist <= 520 && dist > 320 && lastSpokenManeuverStageRef.current !== `${mId}_500`) {
      lastSpokenManeuverStageRef.current = `${mId}_500`;
      speakVoice(`A 500 metros, ${instr.toLowerCase()}.`);
    }
    // Segundo aviso a ~200 metros
    else if (dist <= 250 && dist > 90 && lastSpokenManeuverStageRef.current !== `${mId}_200`) {
      lastSpokenManeuverStageRef.current = `${mId}_200`;
      speakVoice(`A 200 metros, ${instr.toLowerCase()}.`);
    }
    // Aviso imediato no momento da curva (40 a 75 metros)
    else if (dist <= 75 && dist > 15 && lastSpokenManeuverStageRef.current !== `${mId}_now`) {
      lastSpokenManeuverStageRef.current = `${mId}_now`;
      speakVoice(`${instr} agora.`);
    }
  }, [activeManeuver, voiceEnabled, routeStatus, speakVoice]);

  return (
    <div className={`gps-container gps-clean-theme ${isEmbedded ? 'gps-embedded-container' : ''}`}>
      {/* 1. Barra de Status Superior (somente tela cheia) */}
      {!isEmbedded && (
        <div className="gps-status-header-bar">
          <div className="gps-header-left-actions">
            <button 
              className="gps-header-mini-btn" 
              onClick={() => window.history.back()} 
              title="Voltar"
            >
              <ChevronLeft size={22} />
            </button>
            
            {/* Botão de Trava de Tela (Exibido apenas quando ativo, sem poluir com alerta negativo) */}
            {wakeLockInfo.isActive && (
              <button 
                id="btn-wake-lock-status"
                className={`wake-lock-pill-btn wake-${wakeLockInfo.type}`}
                onClick={() => setIsWakeModalOpen(true)}
                title="Trava de tela ativa"
              >
                <Zap size={14} />
                <span>Tela Ativa</span>
              </button>
            )}
          </div>

          <div className="gps-status-items-group">
            <div className="gps-status-item">
              <strong>{Math.round(speed)}</strong> <span>km/h</span>
            </div>
            <div className="gps-status-item">
              <Fuel size={14} color="#00e5ff" />
              <span>{Math.round(truck.fuel || 0)} L</span>
            </div>
            <div className="gps-status-item">
              <Moon size={14} color="#f5a623" />
              <span>{nav.nextRestStop || '06:00'}</span>
            </div>
            <div className="gps-status-item">
              <Clock size={14} color="#94a3b8" />
              <span>{game.time || '14:30'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Viewport 3D do MapLibre GL */}
      <div className="gps-map-viewport">
        <div ref={mapContainerRef} className="maplibre-container-root" />
      </div>

      {/* 3. Card Flutuante de Manobra Superior (Estilo Imagem 2 / Waze) */}
      <div className={`gps-maneuver-card gps-automotive-banner ${isEmbedded ? 'embedded-nav-banner' : ''}`}>
        <div className="maneuver-main-side">
          <div className="maneuver-icon-box">
            {renderManeuverIcon(activeManeuver.iconName, activeManeuver.color)}
          </div>
          <div className="maneuver-dist-highlight">
            {activeManeuver.distanceText}
          </div>
        </div>
        <div className="maneuver-text-box">
          <div className="maneuver-instruction">
            {activeManeuver.instruction}
          </div>
          <div className="maneuver-subtext">
            {activeManeuver.subText}
          </div>
        </div>
        {routeStatus === 'error' && (
          <button 
            className="route-retry-mini-btn"
            onClick={recalculateRoute}
            title="Tentar recalcular rota viária"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* 4. ALERTA ANTECIPADO DE RADAR DE VELOCIDADE (Com contagem em metros e status ultrapassado) */}
      {approachingRadar && (
        <div className={`radar-ahead-warning-card ${approachingRadar.passed ? 'radar-passed-card' : 'blink-alert'}`}>
          <div className="radar-camera-badge" style={{ backgroundColor: approachingRadar.passed ? '#10b981' : '#ef4444' }}>
            <Camera size={26} color="#ffffff" />
          </div>
          <div className="radar-ahead-details">
            <div className="radar-title-row">
              <h4>{approachingRadar.passed ? 'RADAR ULTRAPASSADO' : 'RADAR À FRENTE!'}</h4>
              <span className="radar-limit-pill">{approachingRadar.limit} KM/H</span>
            </div>
            <p>
              {approachingRadar.passed ? (
                <strong style={{ color: '#10b981' }}>✓ Você passou pelo radar com segurança.</strong>
              ) : (
                <>Distância: <strong>{approachingRadar.distance} metros</strong> • Ponto exato piscando no mapa!</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 5. Alerta Visual Silencioso de Velocidade Excedida */}
      {isOverSpeed && !approachingRadar && !isEmbedded && (
        <div className="visual-speeding-warning-pill">
          <ShieldAlert size={18} color="#ff1744" />
          <span>VELOCIDADE ACIMA DO LIMITE ({speedLimit} KM/H)</span>
        </div>
      )}

      {/* 6. Placa de Velocidade no Rodapé (oculto no cluster central pois já tem velocímetro gigante) */}
      {!isEmbedded && (
        <div className="gps-floating-speed">
          <div className={`speed-limit-badge ${isOverSpeed ? 'over-speed' : ''}`} title="Limite da Via">
            {speedLimit}
          </div>
          <div className="gps-mini-speed-display" style={{ color: isOverSpeed ? 'var(--accent-red)' : '#ffffff' }}>
            <span>{Math.round(speed)}</span>
            <small>KM/H</small>
          </div>
        </div>
      )}

      {/* 6.1 Botão Flutuante de Centralizar no Caminhão (quando usuário move o mapa ou usa pinch-to-zoom) */}
      {!followTruck && (
        <button 
          id="btn-gps-recenter-float"
          className="gps-floating-recenter-banner"
          onClick={() => {
            setFollowTruck(true);
            if (mapInstanceRef.current && currentPosRef.current) {
              mapInstanceRef.current.easeTo({
                center: currentPosRef.current,
                bearing: navMode === 'heading-up' ? currentHeadingRef.current : 0,
                pitch: navMode === 'heading-up' ? 58 : 0,
                duration: 450,
              });
            }
          }}
          title="Centralizar câmera no caminhão"
        >
          <Crosshair size={18} />
          <span>Centralizar no Caminhão</span>
        </button>
      )}

      {/* 7. Card Inferior de Destino / ETA com Rota Rodoviária e Seletor de Rotas Google Maps */}
      <div className={`gps-bottom-destination-card ${isEmbedded ? 'embedded-bottom-card' : ''}`}>
        {/* Seletor de Rotas Inteligente Estilo Google Maps com Pedágios e Fronteiras */}
        {routes && routes.length > 1 && (
          <div className="gps-route-options-shelf">
            {routes.map((r) => {
              const isSelected = r.id === activeRouteId;
              const isAlt = r.id !== 'primary';
              const tollsCount = r.tolls_count || 0;
              const bordersCount = r.borders_count || 0;
              return (
                <button
                  key={r.id}
                  id={`btn-route-${r.id}`}
                  className={`gps-route-chip-card ${isSelected ? 'active-chip' : 'inactive-chip'}`}
                  onClick={() => {
                    selectRoute(r.id);
                    if (r.id === 'primary') {
                      speakVoice(`Rota mais rápida selecionada. ${tollsCount > 0 ? `${tollsCount} pedágios no percurso.` : 'Sem pedágios.'}`);
                    } else {
                      speakVoice(`Via alternativa selecionada. Mais ${r.diff_km}. ${tollsCount > 0 ? `${tollsCount} pedágios.` : 'Sem pedágios.'}`);
                    }
                  }}
                  title={isAlt ? `Via alternativa: ${r.diff_km} (${r.diff_minutes})` : "Rota mais rápida recomendada"}
                >
                  <div className="chip-header">
                    <span className="chip-dot" style={{ backgroundColor: isSelected ? '#00e5ff' : '#94a3b8' }} />
                    <span className="chip-name">{r.name}</span>
                    {isSelected && <span className="chip-selected-badge">ATIVA</span>}
                  </div>
                  <div className="chip-body">
                    <span className="chip-km">{r.distance_km} km</span>
                    {isAlt ? (
                      <span className="chip-diff-loss">{r.diff_minutes} ({r.diff_km})</span>
                    ) : (
                      <span className="chip-diff-best">Mais rápida</span>
                    )}
                  </div>
                  <div className="chip-extra-tags">
                    {tollsCount > 0 ? (
                      <span className="tag-toll">💳 {tollsCount} {tollsCount === 1 ? 'pedágio' : 'pedágios'}</span>
                    ) : (
                      <span className="tag-toll-free">✓ Sem pedágios</span>
                    )}
                    {bordersCount > 0 && (
                      <span className="tag-border">🛂 {bordersCount} {bordersCount === 1 ? 'fronteira' : 'fronteiras'}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className={`destination-badge-yellow ${isGoingToPickup ? 'badge-pickup' : ''}`}>
          <Flag size={14} color="#ffffff" />
          <span className="dest-text">
            <strong>{isGoingToPickup ? '📦 Coleta: ' : '🏁 Entrega: '}</strong>
            {destinationInfo ? `${destinationInfo.name}: ` : (isGoingToPickup ? (job?.citySource ? `${job.citySource}: ` : '') : (job?.cityDestination ? `${job.cityDestination}: ` : ''))}
            {routeStats?.distance_km ? `${routeStats.distance_km} km` : (nav.distance ? `${nav.distance} km` : '0 km')} • {nav.time || '--:--'}
            {job?.cargo && job.cargo !== 'Sem Carga' ? ` (${job.cargo})` : ''}
          </span>
          {canToggleStage && (
            <button
              id="btn-gps-toggle-stage"
              className="stage-toggle-btn"
              title={isGoingToPickup ? "Ver rota até a Entrega Final" : "Ver rota até a Coleta na Fábrica"}
              onClick={(e) => {
                e.stopPropagation();
                toggleStage();
              }}
            >
              <span>{isGoingToPickup ? "Ir p/ Entrega ➔" : "➔ Ver Coleta"}</span>
            </button>
          )}
          <button 
            id="btn-gps-fit-route-bottom"
            className="dest-expand-btn" 
            title="Enquadrar Rota Rodoviária Completa"
            onClick={fitRouteToBounds}
          >
            <Route size={15} />
          </button>
        </div>
      </div>

      {/* 8. Coluna de Controles Flutuantes à Direita (ocultos no modo embutido para visual limpo de cockpit) */}
      {!isEmbedded && (
        <div className="gps-controls-column">
          {/* Recalcular Rota Manualmente */}
          <button 
            id="btn-gps-recalculate"
            className={`gps-pill-btn ${routeStatus === 'loading' ? 'btn-spinning' : ''}`}
            onClick={recalculateRoute}
            title="Recalcular Rota pelas Estradas"
          >
            <RefreshCw size={22} color="#00e5ff" />
          </button>

          {/* Enquadrar Rota Completa */}
          <button 
            id="btn-gps-fit-route"
            className="gps-pill-btn" 
            onClick={fitRouteToBounds}
            title="Ver Rota Completa até o Destino"
          >
            <Route size={22} color="#facc15" />
          </button>

          {/* Alternar Modo 3D vs 2D */}
          <button 
            id="btn-gps-navmode"
            className={`gps-pill-btn ${navMode === 'heading-up' ? 'active-cyan' : ''}`} 
            onClick={toggleNavMode}
            title={navMode === 'heading-up' ? "Modo 3D Ativo (Clique para 2D)" : "Modo 2D Ativo (Clique para 3D)"}
          >
            <Layers size={22} />
          </button>

          {/* Travar Câmera no Caminhão */}
          <button 
            id="btn-gps-recenter"
            className={`gps-pill-btn ${followTruck ? 'active-cyan' : ''}`}
            onClick={() => {
              setFollowTruck(true);
              if (mapInstanceRef.current && currentPosRef.current) {
                mapInstanceRef.current.easeTo({
                  center: currentPosRef.current,
                  bearing: navMode === 'heading-up' ? currentHeadingRef.current : 0,
                  pitch: navMode === 'heading-up' ? 58 : 0,
                  duration: 400,
                });
              }
            }}
            title={followTruck ? "Câmera travada no caminhão" : "Travar câmera no caminhão"}
          >
            <Crosshair size={22} />
          </button>

          {/* Voz do GPS */}
          <button 
            id="btn-gps-voice"
            className={`gps-pill-btn ${voiceEnabled ? 'active-cyan' : ''}`}
            onClick={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              if (next) speakVoice('Avisos de voz ativados.');
            }}
            title={voiceEnabled ? "Silenciar avisos de voz" : "Ativar avisos de voz"}
          >
            {voiceEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>

          {/* Zoom In */}
          <button 
            id="btn-gps-zoomin"
            className="gps-pill-btn" 
            onClick={() => mapInstanceRef.current?.zoomIn()} 
            title="Aproximar Zoom"
          >
            <ZoomIn size={22} />
          </button>

          {/* Zoom Out */}
          <button 
            id="btn-gps-zoomout"
            className="gps-pill-btn" 
            onClick={() => mapInstanceRef.current?.zoomOut()} 
            title="Afastar Zoom"
          >
            <ZoomOut size={22} />
          </button>
        </div>
      )}

      {/* 9. Modal Informativo e Honesto de Wake Lock (Tela Ativa) */}
      {isWakeModalOpen && (
        <div className="wake-modal-backdrop" onClick={() => setIsWakeModalOpen(false)}>
          <div className="wake-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wake-modal-header">
              <div className="wake-modal-title">
                <Zap size={20} color="#00e5ff" />
                <h3>Controle de Tela Sempre Ativa</h3>
              </div>
              <button 
                className="wake-modal-close" 
                onClick={() => setIsWakeModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="wake-modal-body">
              <div className={`wake-status-badge badge-${wakeLockInfo.type}`}>
                <strong>Estado:</strong> {wakeLockInfo.label}
              </div>

              <p className="wake-modal-detail">
                {wakeLockInfo.detail}
              </p>

              <div className="wake-tech-info">
                <div>
                  <span>Contexto Seguro (HTTPS):</span>
                  <strong>{wakeLockInfo.isSecureContext ? 'Sim (Permite API Nativa)' : 'Não (HTTP Comum)'}</strong>
                </div>
                <div>
                  <span>Screen Wake Lock API:</span>
                  <strong>{wakeLockInfo.isNativeSupported ? 'Suportada' : 'Não Suportada'}</strong>
                </div>
                <div>
                  <span>Vídeo Auxiliar em Loop:</span>
                  <strong>{wakeLockInfo.isMedia ? 'Em Reprodução' : (wakeLockInfo.allowMediaFallback ? 'Habilitado' : 'Desabilitado')}</strong>
                </div>
              </div>

              <div className="wake-modal-actions">
                <button 
                  className={`btn-wake-toggle ${wakeLockInfo.isActive ? 'btn-active' : ''}`}
                  onClick={() => {
                    wakeLockManager.toggle(true);
                  }}
                >
                  <Zap size={16} />
                  <span>{wakeLockInfo.isActive ? 'Desligar Trava de Tela' : 'Ativar Trava de Tela'}</span>
                </button>

                <button 
                  className="btn-wake-toggle-media"
                  onClick={() => {
                    wakeLockManager.setAllowMediaFallback(!wakeLockInfo.allowMediaFallback);
                  }}
                >
                  <span>{wakeLockInfo.allowMediaFallback ? 'Desativar Vídeo Auxiliar' : 'Permitir Vídeo Auxiliar'}</span>
                </button>
              </div>

              {!wakeLockInfo.isSecureContext && (
                <div className="wake-http-notice">
                  <Info size={16} color="#f59e0b" />
                  <p>
                    <strong>Dica Técnica:</strong> Navegadores móveis exigem HTTPS para liberar a API oficial de Wake Lock fora de localhost. O servidor possui suporte a HTTPS local via <code>python main.py --https</code>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

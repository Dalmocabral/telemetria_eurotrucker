import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol, PMTiles } from 'pmtiles';
import { 
  Crosshair, ZoomIn, ZoomOut, 
  ArrowUp, ArrowUpRight, ArrowRight, ArrowUpLeft, ArrowLeft,
  CornerDownRight, CornerDownLeft, RotateCcw, Route, Compass,
  Volume2, VolumeX, ShieldAlert,
  Flag, Fuel, Moon, Clock, ChevronLeft, ChevronUp,
  Camera, Zap, Layers, MapPin
} from 'lucide-react';
import { requestScreenWakeLock, releaseScreenWakeLock } from '../utils/wakeLock';
import { BlobSource } from '../utils/BlobSource';
import { convertEts2ToGeo } from '../utils/ets2Geo';
import { ETS2_SPEED_CAMERAS } from '../data/ets2_pois';
import { ETS2_ALL_CITIES, findEts2City } from '../data/ets2_cities_full';

// Configuração do Worker URL e do Protocolo PMTiles
if (typeof maplibregl.setWorkerUrl === 'function') {
  maplibregl.setWorkerUrl('/assets/maplibre-gl-worker.mjs');
}

// Instância única do protocolo PMTiles
let pmtilesProtocol = null;
function getPmtilesProtocol() {
  if (!pmtilesProtocol) {
    pmtilesProtocol = new Protocol();
    maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);
  }
  return pmtilesProtocol;
}

/**
 * Calcula orientação de manobra, ângulo relativo e instrução para o HUD de navegação.
 */
function getManeuverGuidance(truckX, truckZ, truckHeading, destCity, navDistance, navDistanceMeters) {
  if (!destCity) {
    return {
      type: 'straight',
      iconName: 'ArrowUp',
      instruction: 'Siga em frente na rodovia',
      subText: 'Navegação por bússola',
      distanceText: navDistance ? `${navDistance} km` : 'Em rota',
      color: '#00e5ff'
    };
  }

  // Vetor do caminhão até a cidade de destino
  const dx = destCity.x - truckX;
  const dz = destCity.z - truckZ;
  
  // No ETS2: Norte é -Z (0°), Leste é +X (90°), Sul é +Z (180°), Oeste é -X (270°)
  const angleToDest = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  
  // Ângulo relativo: diferença entre a proa do caminhão e a direção do destino (-180° a +180°)
  let delta = (angleToDest - truckHeading + 540) % 360 - 180;
  
  // Formatação de distância inteligente (metros quando < 1 km)
  let distanceFormatted = `${navDistance || 0} km`;
  if (typeof navDistanceMeters === 'number' && navDistanceMeters > 0) {
    if (navDistanceMeters < 1000) {
      distanceFormatted = `${Math.round(navDistanceMeters / 10) * 10} m`;
    } else {
      distanceFormatted = `${Math.round(navDistanceMeters / 1000)} km`;
    }
  } else if (navDistance && navDistance < 1) {
    distanceFormatted = `${Math.round(navDistance * 1000)} m`;
  }

  // Análise de manobra baseada na orientação angular do destino em relação à proa
  if (Math.abs(delta) <= 18) {
    return {
      type: 'straight',
      iconName: 'ArrowUp',
      instruction: `Siga em frente rumo a ${destCity.name}`,
      subText: 'Manter velocidade de cruzeiro',
      distanceText: distanceFormatted,
      color: '#00e5ff'
    };
  } else if (delta > 18 && delta <= 50) {
    return {
      type: 'slight-right',
      iconName: 'ArrowUpRight',
      instruction: `Mantenha à direita rumo a ${destCity.name}`,
      subText: 'Ajuste de faixa à frente',
      distanceText: distanceFormatted,
      color: '#38bdf8'
    };
  } else if (delta > 50 && delta <= 110) {
    return {
      type: 'right',
      iconName: 'ArrowRight',
      instruction: `Vire à direita na próxima saída para ${destCity.name}`,
      subText: 'Acessar alça rodoviária à direita',
      distanceText: distanceFormatted,
      color: '#facc15'
    };
  } else if (delta > 110 && delta <= 160) {
    return {
      type: 'sharp-right',
      iconName: 'CornerDownRight',
      instruction: `Curva acentuada à direita para ${destCity.name}`,
      subText: 'Reduza a velocidade na curva',
      distanceText: distanceFormatted,
      color: '#fb923c'
    };
  } else if (delta < -18 && delta >= -50) {
    return {
      type: 'slight-left',
      iconName: 'ArrowUpLeft',
      instruction: `Mantenha à esquerda rumo a ${destCity.name}`,
      subText: 'Ajuste de faixa à frente',
      distanceText: distanceFormatted,
      color: '#38bdf8'
    };
  } else if (delta < -50 && delta >= -110) {
    return {
      type: 'left',
      iconName: 'ArrowLeft',
      instruction: `Vire à esquerda na próxima saída para ${destCity.name}`,
      subText: 'Acessar alça rodoviária à esquerda',
      distanceText: distanceFormatted,
      color: '#facc15'
    };
  } else if (delta < -110 && delta >= -160) {
    return {
      type: 'sharp-left',
      iconName: 'CornerDownLeft',
      instruction: `Curva acentuada à esquerda para ${destCity.name}`,
      subText: 'Reduza a velocidade na curva',
      distanceText: distanceFormatted,
      color: '#fb923c'
    };
  } else {
    return {
      type: 'u-turn',
      iconName: 'RotateCcw',
      instruction: `Faça retorno quando possível`,
      subText: `Destino ${destCity.name} está no sentido oposto`,
      distanceText: distanceFormatted,
      color: '#f87171'
    };
  }
}

function renderManeuverIcon(iconName, color = '#00e5ff') {
  const props = { size: 30, color, strokeWidth: 2.8 };
  switch (iconName) {
    case 'ArrowUp': return <ArrowUp {...props} />;
    case 'ArrowUpRight': return <ArrowUpRight {...props} />;
    case 'ArrowRight': return <ArrowRight {...props} />;
    case 'CornerDownRight': return <CornerDownRight {...props} />;
    case 'ArrowUpLeft': return <ArrowUpLeft {...props} />;
    case 'ArrowLeft': return <ArrowLeft {...props} />;
    case 'CornerDownLeft': return <CornerDownLeft {...props} />;
    case 'RotateCcw': return <RotateCcw {...props} />;
    default: return <ArrowUp {...props} />;
  }
}

export default function GpsView({ data }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerElRef = useRef(null);

  // Estados de controle
  const [navMode, setNavMode] = useState('heading-up'); // 'heading-up' (3D Condução com Pitch 58°) | 'north-up' (2D Plano)
  const [followTruck, setFollowTruck] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

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

  const truck = data?.truck || {};
  const placement = data?.placement || { x: -5740.04, z: 29149.47, heading: 0 };
  const nav = data?.navigation || {};
  const game = data?.game || {};
  const job = data?.job || {};

  const speed = truck.speed || 0;
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > (speedLimit + 2);

  // 1. Manter tela acesa 100% do tempo (NoSleep duplo: WakeLock API + Micro-vídeo H.264)
  const activateWakeLock = useCallback(() => {
    requestScreenWakeLock().then(active => {
      setWakeLockActive(active);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    activateWakeLock();
    return () => {
      releaseScreenWakeLock();
    };
  }, [activateWakeLock]);

  // 2. Síntese de voz em Português (Exclusivo para avisos de radares)
  const speakVoice = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const brVoice = voices.find(v => v.lang === 'pt-BR' || v.lang.startsWith('pt'));
      if (brVoice) utterance.voice = brVoice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Erro de voz:', e);
    }
  }, [voiceEnabled]);

  // Cálculo Dinâmico de Orientação de Rota e Próxima Manobra (Setas e Distância)
  const destCity = useMemo(() => {
    return findEts2City(job?.cityDestination);
  }, [job?.cityDestination]);

  const maneuver = useMemo(() => {
    const currentH = currentHeadingRef.current || placement.heading || 0;
    return getManeuverGuidance(
      placement.x, 
      placement.z, 
      currentH, 
      destCity, 
      nav?.distance, 
      nav?.distanceMeters
    );
  }, [placement.x, placement.z, placement.heading, destCity, nav?.distance, nav?.distanceMeters]);

  // Enquadrar a rota inteira do caminhão até a cidade de destino
  const fitRouteToBounds = useCallback(() => {
    if (destCity && mapInstanceRef.current && currentPosRef.current) {
      const destGeo = convertEts2ToGeo(destCity.x, destCity.z);
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(currentPosRef.current);
      bounds.extend(destGeo);
      setFollowTruck(false);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: { top: 120, bottom: 90, left: 70, right: 70 },
        duration: 1000,
        pitch: 0,
      });
      speakVoice(`Exibindo rota completa até ${destCity.name}.`);
    }
  }, [destCity, speakVoice]);

  // 3. Detecção em Tempo Real de Radares de Velocidade à Frente
  useEffect(() => {
    if (!placement.x && !placement.z) return;
    if (placement.x === 0 && placement.z === 0) return;

    let nearestRadar = null;
    let minDistance = Infinity;

    for (const cam of ETS2_SPEED_CAMERAS) {
      const dx = cam.x - placement.x;
      const dz = cam.z - placement.z;
      const distMeters = Math.hypot(dx, dz);

      if (distMeters < minDistance) {
        minDistance = distMeters;
        nearestRadar = { ...cam, distance: Math.round(distMeters) };
      }
    }

    if (nearestRadar && minDistance <= 650) {
      setApproachingRadar(nearestRadar);

      const now = Date.now();
      if (nearestRadar.id !== lastRadarAlertIdRef.current || (now - lastRadarAlertTimeRef.current > 18000)) {
        lastRadarAlertIdRef.current = nearestRadar.id;
        lastRadarAlertTimeRef.current = now;
        speakVoice(`Atenção: radar de velocidade à frente a ${nearestRadar.distance} metros. Limite de ${nearestRadar.limit} quilômetros por hora.`);
      }
    } else {
      setApproachingRadar(null);
    }
  }, [placement.x, placement.z, speakVoice]);

  // 4. Inicialização do MapLibre GL com PMTiles Vetoriais do ETS2 (TruckNav-Sim Engine)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;
    const protocol = getPmtilesProtocol();

    async function setupMapLibre() {
      try {
        // Carrega os arquivos vetoriais PMTiles na memória
        const [roadsBlob, dataBlob] = await Promise.all([
          fetch('/maps/ets2/map-data/tiles/roads.mp3').then(r => r.blob()),
          fetch('/maps/ets2/map-data/tiles/map-data-combined.mp3').then(r => r.blob())
        ]);

        if (!isMounted) return;

        const roadsPmtiles = new PMTiles(new BlobSource(roadsBlob, 'roads'));
        protocol.add(roadsPmtiles);

        const dataPmtiles = new PMTiles(new BlobSource(dataBlob, 'all-data'));
        protocol.add(dataPmtiles);

        const baseUrl = window.location.origin;
        const initialGeo = convertEts2ToGeo(placement.x, placement.z);
        currentPosRef.current = initialGeo;
        targetPosRef.current = initialGeo;

        const style = {
          version: 8,
          name: "ETS2 Vector 3D",
          sources: {
            // Rodovias (tiles vetorizados do TruckNav com overzoom automático até zoom 14)
            'ets2': {
              type: 'vector',
              tiles: ['pmtiles://roads/{z}/{x}/{y}'],
              minzoom: 5,
              maxzoom: 9,
            },
            // Dados combinados (países, água, áreas de descanso, prefabs)
            'all-data': {
              type: 'vector',
              tiles: ['pmtiles://all-data/{z}/{x}/{y}'],
              minzoom: 5,
              maxzoom: 9,
            },
          },
          sprite: `${baseUrl}/sprites/ets2/sprites`,
          glyphs: `${baseUrl}/glyphs/{fontstack}/{range}.pbf`,
          layers: [
            // 1. Fundo do oceano / vácuo
            {
              id: 'background',
              type: 'background',
              paint: {
                'background-color': '#080d16',
              },
            },
            // 2. Terreno dos países
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
            // 3. Fronteiras entre países
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
            // 4. Água / Lagos / Costas marítimas
            {
              id: 'water',
              type: 'fill',
              source: 'all-data',
              'source-layer': 'water',
              paint: {
                'fill-color': '#060a12',
              },
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
            // 5. Pátios, Empresas e Áreas de Serviço (Prefabs)
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
            // 6. Contorno exterior das rodovias (casing para visual nítido 3D)
            {
              id: 'roads-casing',
              type: 'line',
              source: 'ets2',
              'source-layer': 'ets2',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#09101d',
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  5, 2.2,
                  8, 4.8,
                  10, 9.0,
                  13, 15.0,
                ],
              },
            },
            // 7. Rodovias Principais (Linha vetorial luminosa)
            {
              id: 'roads',
              type: 'line',
              source: 'ets2',
              'source-layer': 'ets2',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#607599',
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  5, 1.4,
                  8, 3.2,
                  10, 6.5,
                  13, 11.0,
                ],
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
          maxZoom: 14,
          pitch: navMode === 'heading-up' ? 58 : 0, // Perspectiva 3D inclinada de condução
          bearing: navMode === 'heading-up' ? (placement.heading || 0) : 0,
          attributionControl: false,
          maxBounds: [
            [-35, -28],
            [35, 30],
          ],
        });

        map.on('load', () => {
          if (!isMounted) return;

          // 8. Linha Viva do Corredor de Navegação / Trajeto Percorrido (Neon Ciano Brilhante)
          map.addSource('route-line-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: [initialGeo, initialGeo],
                  },
                },
              ],
            },
          });

          map.addLayer({
            id: 'route-line-layer',
            type: 'line',
            source: 'route-line-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#00e5ff',
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                6, 3,
                9, 7,
                12, 11,
              ],
              'line-opacity': 0.95,
            },
          });

          // 8.1 Linha Pontilhada de Rumo Direto ao Destino (Glowing Amber / Dourado)
          map.addSource('guidance-line-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });

          map.addLayer({
            id: 'guidance-line-casing',
            type: 'line',
            source: 'guidance-line-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#78350f',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                5, 3.5,
                8, 6.5,
                11, 10.0,
                14, 14.0
              ],
              'line-opacity': 0.85,
              'line-dasharray': [3, 2],
            },
          });

          map.addLayer({
            id: 'guidance-line-core',
            type: 'line',
            source: 'guidance-line-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#facc15',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                5, 2.0,
                8, 3.8,
                11, 6.2,
                14, 8.5
              ],
              'line-opacity': 1.0,
              'line-dasharray': [3, 2],
            },
          });

          // 9. Cidades Principais e Secundárias (Todas as 374 cidades do ETS2 com alta nitidez)
          const citiesGeoJson = {
            type: 'FeatureCollection',
            features: ETS2_ALL_CITIES.map(c => ({
              type: 'Feature',
              properties: { name: c.name },
              geometry: {
                type: 'Point',
                coordinates: convertEts2ToGeo(c.x, c.z),
              },
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
              'text-size': [
                'interpolate', ['linear'], ['zoom'],
                6, 11,
                8, 13,
                11, 16
              ],
              'text-anchor': 'bottom',
              'text-offset': [0, -0.4],
              'text-allow-overlap': false,
              'text-optional': true,
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#060a12',
              'text-halo-width': 2.2,
            },
          });

          // 10. Ícones Oficiais do ETS2 (Postos de Combustível, Oficinas, Áreas de Descanso, Pedágios)
          map.addLayer({
            id: 'all-sprites',
            type: 'symbol',
            source: 'all-data',
            'source-layer': 'spritelocations',
            filter: ['!=', ['get', 'poiType'], 'road'],
            minzoom: 7,
            layout: {
              'icon-image': ['get', 'sprite'],
              'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, 0.7,
                9, 1.0,
                11, 1.35,
              ],
              'icon-allow-overlap': false,
              'symbol-sort-key': ['match', ['get', 'sprite'], 'gas_ico', 1, 'service_ico', 2, 10],
              'symbol-placement': 'point',
            },
          });

          // 10. Radares de Velocidade (Pontos no mapa com alertas)
          const radarsGeoJson = {
            type: 'FeatureCollection',
            features: ETS2_SPEED_CAMERAS.map(cam => ({
              type: 'Feature',
              properties: { name: cam.name, limit: `${cam.limit}` },
              geometry: {
                type: 'Point',
                coordinates: convertEts2ToGeo(cam.x, cam.z),
              },
            })),
          };

          map.addSource('radars-source', {
            type: 'geojson',
            data: radarsGeoJson,
          });

          map.addLayer({
            id: 'radars-layer',
            type: 'circle',
            source: 'radars-source',
            paint: {
              'circle-radius': 7,
              'circle-color': '#ef4444',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            },
          });

          // 11. Destino do Frete / Rota (Ponto Dourado Pulsante + Rótulo)
          map.addSource('destination-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
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

        // Marcador do Caminhão em 3D (Seta Neon Ciano compacta e nítida)
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

        map.on('dragstart', () => {
          setFollowTruck(false);
        });
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

  // 5. Atualização de Alvos da Telemetria (Converte para WGS84 Geo)
  useEffect(() => {
    if (placement.x === 0 && placement.z === 0) return;
    const target = convertEts2ToGeo(placement.x, placement.z);
    targetPosRef.current = target;

    if (typeof placement.heading === 'number' && isFinite(placement.heading)) {
      targetHeadingRef.current = placement.heading;
    }

    // Registra rastro percorrido nas estradas e alinha orientação em movimento
    const currentBreadcrumbs = breadcrumbsRef.current;
    const lastPoint = currentBreadcrumbs[currentBreadcrumbs.length - 1];
    if (!lastPoint) {
      breadcrumbsRef.current.push(target);
    } else {
      const dLon = target[0] - lastPoint[0];
      const dLat = target[1] - lastPoint[1];
      const dist = Math.hypot(dLon, dLat);

      if (dist > 0.00015 && speed > 2.0) {
        // Alinha a orientação do caminhão com o vetor de avanço real nas curvas
        const moveAngle = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
        let diffMove = (moveAngle - targetHeadingRef.current + 540) % 360 - 180;
        if (Math.abs(diffMove) < 70) {
          targetHeadingRef.current = (targetHeadingRef.current + diffMove * 0.35 + 360) % 360;
        }

        breadcrumbsRef.current.push(target);
        if (breadcrumbsRef.current.length > 80) {
          breadcrumbsRef.current.shift();
        }

        // Atualiza a linha viva no MapLibre GL
        if (mapInstanceRef.current && mapLoaded) {
          const source = mapInstanceRef.current.getSource('route-line-source');
          if (source) {
            // Estende vetor para a pista à frente
            const headingRad = ((targetHeadingRef.current || 0) * Math.PI) / 180;
            const aheadDist = 0.0018; // ~200 metros na projeção WGS84
            const pAhead = [
              target[0] + Math.sin(headingRad) * aheadDist,
              target[1] + Math.cos(headingRad) * aheadDist,
            ];

            source.setData({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: [...breadcrumbsRef.current, pAhead],
                  },
                },
              ],
            });
          }
        }
      }
    }
  }, [placement.x, placement.z, placement.heading, speed, mapLoaded]);

  // 5.1 Atualização da Linha Pontilhada de Rumo e Marcador do Destino
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    if (placement.x === 0 && placement.z === 0) return;

    const guidanceSource = mapInstanceRef.current.getSource('guidance-line-source');
    const destSource = mapInstanceRef.current.getSource('destination-source');

    if (destCity) {
      const truckGeo = convertEts2ToGeo(placement.x, placement.z);
      const destGeo = convertEts2ToGeo(destCity.x, destCity.z);

      // Atualiza a Linha Pontilhada de Rumo Direto até a Cidade de Destino
      if (guidanceSource) {
        guidanceSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [truckGeo, destGeo],
              },
            },
          ],
        });
      }

      // Atualiza o Marcador de Destino com Distância e Carga
      if (destSource) {
        const distLabel = nav?.distance ? `${nav.distance} km` : '';
        const cargoLabel = job?.cargo && job.cargo !== 'Sem Carga' ? ` • ${job.cargo}` : '';
        destSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                name: `🏁 ${destCity.name} (${distLabel}${cargoLabel})`,
              },
              geometry: {
                type: 'Point',
                coordinates: destGeo,
              },
            },
          ],
        });
      }
    } else {
      // Sem destino ativo: limpa a linha pontilhada e pino
      if (guidanceSource) {
        guidanceSource.setData({ type: 'FeatureCollection', features: [] });
      }
      if (destSource) {
        destSource.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [placement.x, placement.z, destCity, job?.cargo, nav?.distance, mapLoaded]);

  // 6. LOOP DE CÂMERA 3D A 60 FPS (LERP + JUMPTO): ULTRA-SUAVE
  useEffect(() => {
    const renderLoop = () => {
      try {
        if (targetPosRef.current && mapInstanceRef.current && markerElRef.current) {
          const targetLon = targetPosRef.current[0];
          const targetLat = targetPosRef.current[1];

          if (isFinite(targetLon) && isFinite(targetLat)) {
            // LERP de posição
            currentPosRef.current[0] += (targetLon - currentPosRef.current[0]) * 0.18;
            currentPosRef.current[1] += (targetLat - currentPosRef.current[1]) * 0.18;

            const currentPos = [currentPosRef.current[0], currentPosRef.current[1]];
            markerElRef.current.setLngLat(currentPos);

            // Suavização do heading (com normalização em 360°)
            const targetH = targetHeadingRef.current || 0;
            let diff = (targetH - currentHeadingRef.current + 540) % 360 - 180;
            currentHeadingRef.current = (currentHeadingRef.current + diff * 0.15 + 360) % 360;

            const heading = currentHeadingRef.current;
            const map = mapInstanceRef.current;

            if (followTruck) {
              if (navMode === 'heading-up') {
                // Modo Condução 3D: Câmera inclinada a 58° girando suavemente junto com a cabine
                map.jumpTo({
                  center: currentPos,
                  bearing: heading,
                  pitch: 58,
                });
                markerElRef.current.setRotation(0);
              } else {
                // Modo Norte Fixo: Visão de satélite plana (Pitch 0°)
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

  return (
    <div className="gps-container gps-clean-theme">
      {/* 1. Barra de Status Superior */}
      <div className="gps-status-header-bar">
        <div className="gps-header-left-actions">
          <button 
            className="gps-header-mini-btn" 
            onClick={() => window.history.back()} 
            title="Voltar"
          >
            <ChevronLeft size={22} />
          </button>
          
          {/* Botão de Trava de Tela Sempre Ativa */}
          <button 
            className={`wake-lock-pill-btn ${wakeLockActive ? 'wake-active' : ''}`}
            onClick={activateWakeLock}
            title="Clique para garantir que a tela nunca apagará"
          >
            <Zap size={14} />
            <span>{wakeLockActive ? 'Tela Travada 100%' : 'Ativar Tela Acesa'}</span>
          </button>
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

      {/* 2. Viewport 3D do MapLibre GL */}
      <div className="gps-map-viewport">
        <div ref={mapContainerRef} className="maplibre-container-root" />
      </div>

      {/* 3. Card Flutuante de Manobra Superior (Estilo Waze / Google Maps) */}
      <div className="gps-maneuver-card">
        <div 
          className="maneuver-icon-box"
          style={{
            background: `${maneuver.color}22`,
            borderColor: `${maneuver.color}66`,
            boxShadow: `0 0 14px ${maneuver.color}33`,
          }}
        >
          {renderManeuverIcon(maneuver.iconName, maneuver.color)}
        </div>
        <div className="maneuver-text-box">
          <div className="maneuver-dist">
            {maneuver.distanceText}
          </div>
          <div className="maneuver-instruction">
            {maneuver.instruction}
          </div>
          <div className="maneuver-subtext">
            {maneuver.subText}
          </div>
        </div>
      </div>

      {/* 4. ALERTA ANTECIPADO DE RADAR DE VELOCIDADE (Com contagem em metros) */}
      {approachingRadar && (
        <div className="radar-ahead-warning-card blink-alert">
          <div className="radar-camera-badge">
            <Camera size={26} color="#ffffff" />
          </div>
          <div className="radar-ahead-details">
            <div className="radar-title-row">
              <h4>RADAR À FRENTE!</h4>
              <span className="radar-limit-pill">{approachingRadar.limit} KM/H</span>
            </div>
            <p>Distância: <strong>{approachingRadar.distance} metros</strong> • Reduza a velocidade!</p>
          </div>
        </div>
      )}

      {/* 5. Alerta Visual Silencioso de Velocidade Excedida (Sem Voz) */}
      {isOverSpeed && !approachingRadar && (
        <div className="visual-speeding-warning-pill">
          <ShieldAlert size={18} color="#ff1744" />
          <span>VELOCIDADE ACIMA DO LIMITE ({speedLimit} KM/H)</span>
        </div>
      )}

      {/* 6. Placa de Velocidade no Rodapé */}
      <div className="gps-floating-speed">
        <div className={`speed-limit-badge ${isOverSpeed ? 'over-speed' : ''}`} title="Limite da Via">
          {speedLimit}
        </div>
        <div className="gps-mini-speed-display" style={{ color: isOverSpeed ? 'var(--accent-red)' : '#ffffff' }}>
          <span>{Math.round(speed)}</span>
          <small>KM/H</small>
        </div>
      </div>

      {/* 7. Card Inferior de Destino / ETA */}
      <div className="gps-bottom-destination-card">
        <div className="destination-badge-yellow">
          <Flag size={16} color="#ffffff" />
          <span className="dest-text">
            {destCity ? `${destCity.name}: ` : (job?.cityDestination ? `${job.cityDestination}: ` : '')}
            {nav.distance ? `${nav.distance} km` : '0 km'} • {nav.time || '--:--'}
            {job?.cargo && job.cargo !== 'Sem Carga' ? ` (${job.cargo})` : ''}
          </span>
          <button 
            className="dest-expand-btn" 
            title="Enquadrar Rota Completa"
            onClick={fitRouteToBounds}
          >
            <Route size={16} />
          </button>
        </div>
      </div>

      {/* 8. Coluna de Controles Flutuantes à Direita */}
      <div className="gps-controls-column">
        {/* Enquadrar Rota Completa do Caminhão ao Destino */}
        <button 
          id="btn-gps-fit-route"
          className="gps-pill-btn" 
          onClick={fitRouteToBounds}
          title="Ver Rota Completa até o Destino"
        >
          <Route size={22} color="#facc15" />
        </button>

        {/* Alternar Modo 3D Condução (Pitch 58°) vs Modo 2D Norte Fixo */}
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
            if (next) speakVoice('Avisos de radares ativados.');
          }}
          title={voiceEnabled ? "Silenciar avisos de radar" : "Ativar avisos de radar"}
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

    </div>
  );
}

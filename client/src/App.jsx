import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import SpeedometerView from './components/SpeedometerView';
import GpsView from './components/GpsView';
import SplitView from './components/SplitView';
import QrModal from './components/QrModal';
import ErrorBoundary from './components/ErrorBoundary';
import { wakeLockManager } from './utils/wakeLock';
import './skins.css';

const DEFAULT_TELEMETRY = {
  connected: false,
  simulated: false,
  game: { paused: true, time: '--:--' },
  truck: {
    speed: 0,
    speedLimit: 80,
    rpm: 0,
    maxRpm: 2500,
    gear: 0,
    displayedGear: 'N',
    suggestedGear: 1,
    fuel: 0,
    fuelCapacity: 1200,
    waterTemperature: 0,
    batteryVoltage: 24,
    brakeAirPressure: 8,
    parkBrake: true,
  },
  lights: {},
  job: { onJob: false, cargo: 'Aguardando ETS2...' },
  navigation: { distance: 0, time: '--:--' },
  placement: { x: -21700.68, y: 0, z: -5700.77, heading: 0 },
};

export default function App() {
  // Suporte a definir modo pela URL (ex: ?view=gps ou ?view=cluster) ou persistência local
  const getInitialView = () => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam && ['cluster', 'gps', 'split'].includes(viewParam)) {
      return viewParam;
    }
    return localStorage.getItem('ets2_view_mode') || 'cluster';
  };

  const [viewMode, setViewModeState] = useState(getInitialView);
  const [telemetry, setTelemetry] = useState(DEFAULT_TELEMETRY);
  const [connectionStatus, setConnectionStatus] = useState('offline'); // 'connected' | 'simulated' | 'offline'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const setViewMode = (mode) => {
    setViewModeState(mode);
    localStorage.setItem('ets2_view_mode', mode);
  };

  // Conexão WebSocket com reconexão automática
  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = () => {
      const host = window.location.hostname || 'localhost';
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const defaultPort = isHttps ? '8443' : '8000';
      const port = (window.location.port && window.location.port !== '5173') ? window.location.port : defaultPort;
      const wsUrl = `${wsProtocol}//${host}:${port}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          console.log('[WebSocket] Conectado ao servidor de telemetria!');
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            setTelemetry(data);
            if (data.connected) {
              setConnectionStatus('connected');
            } else if (data.simulated) {
              setConnectionStatus('simulated');
            } else {
              setConnectionStatus('offline');
            }
          } catch (err) {
            console.error('[WebSocket] Erro ao parsear dados:', err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setConnectionStatus('offline');
          console.warn('[WebSocket] Conexão perdida. Tentando reconectar em 2s...');
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.error('[WebSocket] Erro ao criar socket:', err);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // Monitora estado de tela cheia e inicializa o gerenciador global de tela ativa
  useEffect(() => {
    wakeLockManager.requestWakeLock(false);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Não foi possível ativar tela cheia:', err);
      });
    }
  };

  const sendAction = (actionName) => {
    // 1. Envia via WebSocket se estiver ativo
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: actionName }));
      return; // Garante disparo único
    }
    // 2. Se o WebSocket não estiver conectado, usa chamada HTTP rápida como fallback
    const host = window.location.hostname || 'localhost';
    fetch(`http://${host}:8000/api/action/${actionName}`).catch(() => {});
  };

  return (
    <div className="app-container">
      {/* Cabeçalho de Navegação e Status */}
      <Header 
        viewMode={viewMode}
        setViewMode={setViewMode}
        connectionStatus={connectionStatus}
        onOpenQr={() => setIsQrOpen(true)}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
      />

      {/* Conteúdo Principal Protegido por ErrorBoundary */}
      <main className="content-area">
        <ErrorBoundary>
          {viewMode === 'cluster' && (
            <SpeedometerView data={telemetry} onSendAction={sendAction} />
          )}

          {viewMode === 'gps' && (
            <GpsView data={telemetry} />
          )}

          {viewMode === 'split' && (
            <SplitView data={telemetry} onSendAction={sendAction} />
          )}
        </ErrorBoundary>
      </main>

      {/* Modal para conectar o 2º celular */}
      <QrModal 
        isOpen={isQrOpen} 
        onClose={() => setIsQrOpen(false)} 
      />
    </div>
  );
}

import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

/**
 * Modelo 2: Route Navigator (Baseado fielmente na Foto 2)
 * Painel em ardósia escura com ponteiros analógicos vermelhos, leituras digitais
 * centrais nítidas, mini-mapa esquemático de rota no centro, régua de luzes de alerta
 * e pílula inferior com data e hora.
 */
export default function SkinRouteNavigator({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};
  const game = data?.game || {};
  const job = data?.job || {};

  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  // Rotação do ponteiro de velocidade (0 a 280 km/h mapeado de -130° a +130°)
  const speedFraction = Math.min(1, Math.max(0, speed / 280));
  const speedNeedleDeg = -130 + speedFraction * 260;

  // RPM e rotação do ponteiro (0 a 8000 RPM mapeado de -130° a +130°)
  const rpm = truck.rpm || 0;
  const rpmFraction = Math.min(1, Math.max(0, (rpm * 3.2) / 8000));
  const rpmNeedleDeg = -130 + rpmFraction * 260;
  const rpmDisplayVal = (rpm / 1000).toFixed(0) || "0";

  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelPercent = Math.min(100, Math.max(0, (fuel / fuelCapacity) * 100));

  const waterTemp = Math.round(truck.waterTemperature || 85);
  const tempPercent = Math.min(100, Math.max(0, ((waterTemp - 40) / 80) * 100));

  return (
    <div className="skin-route-container">
      <div className="skin-route-housing">
        {/* BARRA SUPERIOR DE LUZES DE ALERTA (Estilo Foto 2) */}
        <div className="route-telltale-bar">
          {/* Seta E */}
          <div className={`route-telltale-icon ${lights.blinkerLeft ? 'telltale-active-green blink' : ''}`}>
            <svg width="22" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 6l-6 6 6 6V6z" />
            </svg>
          </div>
          {/* Farol Baixo */}
          <div className={`route-telltale-icon ${lights.beamLow ? 'telltale-active-cyan' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="4" />
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
              <line x1="1" y1="12" x2="4" y2="12" />
            </svg>
          </div>
          {/* Farol Alto */}
          <div className={`route-telltale-icon ${lights.beamHigh ? 'telltale-active-blue' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          {/* Pisca Alerta / Triângulo */}
          <div className={`route-telltale-icon ${lights.blinkerLeft && lights.blinkerRight ? 'telltale-active-amber blink' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="12 2 22 20 2 20" />
            </svg>
          </div>
          {/* Freio de Mão */}
          <div className={`route-telltale-icon ${truck.parkBrake ? 'telltale-active-red' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 9h3a2 2 0 0 1 0 4H9V9z" fill="currentColor" />
            </svg>
          </div>
          {/* Seta D */}
          <div className={`route-telltale-icon ${lights.blinkerRight ? 'telltale-active-green blink' : ''}`}>
            <svg width="22" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 18l6-6-6-6v12z" />
            </svg>
          </div>
        </div>

        {/* DIAL ESQUERDO: VELOCÍMETRO (0 - 280 km/h) COM PONTEIRO VERMELHO */}
        <div className="route-dial route-dial-left">
          <svg viewBox="0 0 320 320" className="route-dial-svg">
            <defs>
              <linearGradient id="route-red-needle" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4d4f" />
                <stop offset="100%" stopColor="#cf1322" />
              </linearGradient>
            </defs>

            {/* Aro de Fundo */}
            <circle cx="160" cy="160" r="148" fill="#111827" stroke="#374151" strokeWidth="4" />
            <circle cx="160" cy="160" r="142" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />

            {/* Ticks da escala (0 a 280) */}
            {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280].map((v) => {
              const f = v / 280;
              const angleDeg = -130 + f * 260;
              const angleRad = (angleDeg - 90) * (Math.PI / 180);
              const r1 = 126;
              const r2 = 138;
              const x1 = 160 + Math.cos(angleRad) * r1;
              const y1 = 160 + Math.sin(angleRad) * r1;
              const x2 = 160 + Math.cos(angleRad) * r2;
              const y2 = 160 + Math.sin(angleRad) * r2;

              const isMajor = v % 20 === 0;
              const tx = 160 + Math.cos(angleRad) * 108;
              const ty = 160 + Math.sin(angleRad) * 108 + 4;

              return (
                <g key={v}>
                  <line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke="#e2e8f0" 
                    strokeWidth={isMajor ? 2.5 : 1.2} 
                  />
                  {isMajor && (
                    <text 
                      x={tx} y={ty} 
                      fill="#cbd5e1" 
                      fontSize="12.5" 
                      fontWeight="600" 
                      textAnchor="middle" 
                      fontFamily="Inter, sans-serif"
                    >
                      {v}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Arco Inferior de Combustível (Ciano Neon) */}
            <path 
              d="M 95 248 A 95 95 0 0 1 225 248" 
              fill="none" 
              stroke="#1e293b" 
              strokeWidth="4" 
              strokeLinecap="round" 
            />
            <path 
              d="M 95 248 A 95 95 0 0 1 225 248" 
              fill="none" 
              stroke="#06b6d4" 
              strokeWidth="4" 
              strokeDasharray={`${(fuelPercent / 100) * 130} 200`}
              strokeLinecap="round" 
            />

            {/* Ponteiro Analógico Vermelho Fluorescente */}
            <g transform={`rotate(${speedNeedleDeg} 160 160)`}>
              <line x1="160" y1="160" x2="160" y2="38" stroke="url(#route-red-needle)" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="160" y1="160" x2="160" y2="38" stroke="#ff7875" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>

          {/* Display Digital Central de Velocidade */}
          <div className="route-dial-center">
            <div 
              className="route-digital-speed" 
              style={{ color: isOverSpeed ? '#ff4d4f' : '#ffffff' }}
            >
              {speed}
            </div>
            <div className="route-unit">km/h</div>
          </div>

          {/* Ícone de Combustível no Fundo do Mostrador */}
          <div className="route-bottom-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5">
              <path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17M3 22h12M15 9h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L20.5 6.5" />
            </svg>
          </div>
        </div>

        {/* CENTRO: MINI-MAPA DE ROTA NAVEGACIONAL (Estilo Foto 2) */}
        <div className="route-center-nav-display">
          <div className="route-minimap-card">
            {/* Grade de ruas esquemática */}
            <div className="minimap-grid-lines">
              <div className="grid-h-line" style={{ top: '25%' }} />
              <div className="grid-h-line" style={{ top: '65%' }} />
              <div className="grid-v-line" style={{ left: '30%' }} />
              <div className="grid-v-line" style={{ left: '70%' }} />
            </div>

            {/* Linha de Rota Ciano em Ângulo Reto */}
            <svg className="minimap-route-svg" viewBox="0 0 100 140">
              <path 
                d="M 50 115 L 50 55 L 75 55" 
                fill="none" 
                stroke="#00e5ff" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {/* Ponto do Caminhão */}
              <circle cx="50" cy="115" r="5" fill="#00e5ff" />
              <circle cx="50" cy="115" r="9" fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.6" className="blink" />
              {/* Pin de Destino */}
              <circle cx="75" cy="55" r="4" fill="#00e5ff" />
            </svg>

            {/* Indicador de Destino */}
            <div className="minimap-target-badge">
              <MapPin size={14} color="#00e5ff" />
              <span>{job.cityDestination || "Destino"}</span>
            </div>
          </div>
        </div>

        {/* DIAL DIREITO: TACÔMETRO (0 - 8 x1000 RPM) COM PONTEIRO VERMELHO */}
        <div className="route-dial route-dial-right">
          <svg viewBox="0 0 320 320" className="route-dial-svg">
            <circle cx="160" cy="160" r="148" fill="#111827" stroke="#374151" strokeWidth="4" />
            <circle cx="160" cy="160" r="142" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />

            {/* Ticks da escala (0 a 8) */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((v) => {
              const f = v / 8;
              const angleDeg = -130 + f * 260;
              const angleRad = (angleDeg - 90) * (Math.PI / 180);
              const r1 = 126;
              const r2 = 138;
              const x1 = 160 + Math.cos(angleRad) * r1;
              const y1 = 160 + Math.sin(angleRad) * r1;
              const x2 = 160 + Math.cos(angleRad) * r2;
              const y2 = 160 + Math.sin(angleRad) * r2;

              const isRed = v >= 6;
              const tx = 160 + Math.cos(angleRad) * 108;
              const ty = 160 + Math.sin(angleRad) * 108 + 4;

              return (
                <g key={v}>
                  <line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={isRed ? "#ef4444" : "#e2e8f0"} 
                    strokeWidth={2.5} 
                  />
                  <text 
                    x={tx} y={ty} 
                    fill={isRed ? "#f87171" : "#cbd5e1"} 
                    fontSize="13" 
                    fontWeight="600" 
                    textAnchor="middle" 
                    fontFamily="Inter, sans-serif"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Arco Inferior de Temperatura */}
            <path 
              d="M 95 248 A 95 95 0 0 1 225 248" 
              fill="none" 
              stroke="#1e293b" 
              strokeWidth="4" 
              strokeLinecap="round" 
            />
            <path 
              d="M 95 248 A 95 95 0 0 1 225 248" 
              fill="none" 
              stroke="#06b6d4" 
              strokeWidth="4" 
              strokeDasharray={`${(tempPercent / 100) * 130} 200`}
              strokeLinecap="round" 
            />

            {/* Ponteiro Analógico Vermelho de RPM */}
            <g transform={`rotate(${rpmNeedleDeg} 160 160)`}>
              <line x1="160" y1="160" x2="160" y2="38" stroke="url(#route-red-needle)" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="160" y1="160" x2="160" y2="38" stroke="#ff7875" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>

          {/* Display Digital Central de RPM */}
          <div className="route-dial-center">
            <div className="route-digital-speed route-rpm-color">
              {truck.displayedGear || rpmDisplayVal}
            </div>
            <div className="route-unit">
              {truck.displayedGear ? `RPM: ${rpm}` : 'x1000 RPM'}
            </div>
          </div>

          {/* Ícone de Temperatura no Fundo */}
          <div className="route-bottom-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
            </svg>
          </div>
        </div>

        {/* PÍLULA INFERIOR COM DATA, HORA E CLIMA (Estilo Foto 2) */}
        <div className="route-bottom-datetime-pill">
          <span>{game.time ? `HOJE · ${game.time} · 24°C` : "24 FEB · 11:10 am · 24°C"}</span>
        </div>
      </div>
    </div>
  );
}

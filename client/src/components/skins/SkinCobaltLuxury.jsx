import React from 'react';

/**
 * Modelo 5: Cobalt Luxury Blue (Baseado fielmente na Foto 5)
 * Cluster digital de alta definição em azul cobalto radiante com gradiente profundo,
 * ponteiros azul-elétrico luminosos, mostrador central de velocidade, seletor de marcha PRND,
 * régua completa de diagnóstico de motor e indicador de autonomia.
 */
export default function SkinCobaltLuxury({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};
  const game = data?.game || {};

  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  // Velocidade de 0 a 240 km/h (-130° a +130°)
  const speedFraction = Math.min(1, Math.max(0, speed / 240));
  const speedNeedleDeg = -130 + speedFraction * 260;

  // RPM de 0 a 8 x1000 RPM (-130° a +130°)
  const rpm = truck.rpm || 0;
  const rpmFraction = Math.min(1, Math.max(0, (rpm * 3.2) / 8000));
  const rpmNeedleDeg = -130 + rpmFraction * 260;

  // Combustível
  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelFraction = Math.min(1, Math.max(0, fuel / fuelCapacity));

  // Marchas
  const gear = truck.gear || 0;
  const isReverse = gear < 0;
  const isNeutral = gear === 0;
  const isDrive = gear > 0;
  const isPark = truck.parkBrake && isNeutral;

  const odo = Math.round(truck.odometer || 4523);
  const rangeKm = Math.round((fuel / Math.max(1, truck.fuelAverageConsumption || 35)) * 100);

  return (
    <div className="skin-cobalt-container">
      <div className="cobalt-cluster-housing">
        {/* CABEÇALHO SUPERIOR (Temperatura, Linha Azul e Relógio) */}
        <div className="cobalt-header-bar">
          <div className="cobalt-temp">24 °C</div>
          
          <div className="cobalt-eyebrow-accent">
            <svg width="180" height="18" viewBox="0 0 180 18">
              <path d="M 10 16 L 80 4 L 90 12 L 100 4 L 170 16" fill="none" stroke="#2563eb" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="cobalt-clock">{game.time || "13:55"}</div>
        </div>

        {/* ÁREA DOS DOIS INSTRUMENTOS COBALTO */}
        <div className="cobalt-main-stage">
          
          {/* DIAL ESQUERDO: VELOCÍMETRO (0 - 240 km/h) */}
          <div className="cobalt-dial cobalt-dial-left">
            <svg viewBox="0 0 340 340" className="cobalt-svg">
              <defs>
                <radialGradient id="cobalt-glow-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.85" />
                  <stop offset="65%" stopColor="#172554" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#030712" stopOpacity="0.98" />
                </radialGradient>
                <linearGradient id="cobalt-needle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>

              {/* Fundo Azul Cobalto com Glow Profundo */}
              <circle cx="170" cy="170" r="160" fill="url(#cobalt-glow-grad)" stroke="#1d4ed8" strokeWidth="3" />
              <circle cx="170" cy="170" r="148" fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.5" />
              <circle cx="170" cy="170" r="82" fill="#030712" stroke="#1e40af" strokeWidth="2" />

              {/* Ticks e Números Brancos Nítidos (0 a 240) */}
              {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240].map((v) => {
                const f = v / 240;
                const angleDeg = -130 + f * 260;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const r1 = 138;
                const r2 = 148;
                const x1 = 170 + Math.cos(angleRad) * r1;
                const y1 = 170 + Math.sin(angleRad) * r1;
                const x2 = 170 + Math.cos(angleRad) * r2;
                const y2 = 170 + Math.sin(angleRad) * r2;
                const tx = 170 + Math.cos(angleRad) * 115;
                const ty = 170 + Math.sin(angleRad) * 115 + 5;
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="2.5" />
                    <text x={tx} y={ty} fill="#ffffff" fontSize="16" fontWeight="700" textAnchor="middle" fontFamily="Inter">
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* Arco Inferior de Combustível com Faixa Verde de Reserva */}
              <path d="M 100 280 A 120 120 0 0 1 240 280" fill="none" stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M 100 280 A 120 120 0 0 1 130 288" fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" />
              <path 
                d="M 100 280 A 120 120 0 0 1 240 280" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="4.5" 
                strokeDasharray={`${fuelFraction * 135} 200`}
                strokeLinecap="round"
              />

              {/* Ponteiro Azul Cobalto */}
              <g transform={`rotate(${speedNeedleDeg} 170 170)`}>
                <polygon points="166,170 174,170 171,28 169,28" fill="url(#cobalt-needle-grad)" />
                <line x1="170" y1="170" x2="170" y2="28" stroke="#93c5fd" strokeWidth="1.5" />
              </g>
              <circle cx="170" cy="170" r="9" fill="#030712" stroke="#3b82f6" strokeWidth="3" />
            </svg>

            {/* Display Central da Velocidade */}
            <div className="cobalt-center-speed">
              <span className="cobalt-speed-num" style={{ color: isOverSpeed ? '#f43f5e' : '#ffffff' }}>
                {speed}
              </span>
              <span className="cobalt-speed-unit">km/h</span>
            </div>

            {/* Marcadores de Combustível (1/2, 1) */}
            <div className="cobalt-fuel-legend">
              <span>⛽</span>
              <span>1/2</span>
              <span>1</span>
            </div>
          </div>

          {/* COLUNA CENTRAL COM DADOS DE VIAGEM E LUZES */}
          <div className="cobalt-center-column">
            {/* Setas e Farol Alto */}
            <div className="cobalt-center-lights">
              <svg 
                width="28" height="22" viewBox="0 0 24 24" 
                fill={lights.blinkerLeft ? "#f97316" : "#1e293b"}
                className={lights.blinkerLeft ? "blink-fast" : ""}
              >
                <polygon points="14,6 6,12 14,18" />
              </svg>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={lights.beamHigh ? "#3b82f6" : "#1e293b"}>
                <circle cx="12" cy="12" r="7" />
              </svg>
              <svg 
                width="28" height="22" viewBox="0 0 24 24" 
                fill={lights.blinkerRight ? "#f97316" : "#1e293b"}
                className={lights.blinkerRight ? "blink-fast" : ""}
              >
                <polygon points="10,6 18,12 10,18" />
              </svg>
            </div>

            {/* Estatísticas de Autonomia e Hodômetro */}
            <div className="cobalt-stats-stack">
              <div className="cobalt-stat-row">
                <span>➔ ⛽ {rangeKm} km</span>
              </div>
              <div className="cobalt-stat-row">
                <span>TM {odo}.0 km</span>
              </div>
            </div>

            {/* Cinto e Freio P */}
            <div className="cobalt-status-icons">
              <div className="cobalt-seatbelt">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5.5 21v-2a7 7 0 0 1 13 0v2" />
                  <line x1="7" y1="13" x2="17" y2="21" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
              <div className={`cobalt-park-badge ${truck.parkBrake ? 'active-red' : ''}`}>
                <span>(P)</span>
              </div>
            </div>
          </div>

          {/* DIAL DIREITO: TACÔMETRO (0 - 8 x1000 RPM) E SELETOR PRND */}
          <div className="cobalt-dial cobalt-dial-right">
            <svg viewBox="0 0 340 340" className="cobalt-svg">
              <circle cx="170" cy="170" r="160" fill="url(#cobalt-glow-grad)" stroke="#1d4ed8" strokeWidth="3" />
              <circle cx="170" cy="170" r="148" fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.5" />
              
              {/* Pontilhado Azul Decorativo no Limite Superior */}
              <circle cx="170" cy="170" r="138" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 4" strokeOpacity="0.8" />

              {/* Ticks e Números 0 a 8 */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((v) => {
                const f = v / 8;
                const angleDeg = -130 + f * 260;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const r1 = 138;
                const r2 = 148;
                const x1 = 170 + Math.cos(angleRad) * r1;
                const y1 = 170 + Math.sin(angleRad) * r1;
                const x2 = 170 + Math.cos(angleRad) * r2;
                const y2 = 170 + Math.sin(angleRad) * r2;
                const tx = 170 + Math.cos(angleRad) * 115;
                const ty = 170 + Math.sin(angleRad) * 115 + 5;
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="2.5" />
                    <text x={tx} y={ty} fill="#ffffff" fontSize="17" fontWeight="700" textAnchor="middle" fontFamily="Inter">
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* Ponteiro de RPM */}
              <g transform={`rotate(${rpmNeedleDeg} 170 170)`}>
                <polygon points="166,170 174,170 171,28 169,28" fill="url(#cobalt-needle-grad)" />
                <line x1="170" y1="170" x2="170" y2="28" stroke="#93c5fd" strokeWidth="1.5" />
              </g>
              <circle cx="170" cy="170" r="82" fill="#030712" stroke="#1e40af" strokeWidth="2" />
            </svg>

            {/* SELETOR VERTICAL PRND NO CENTRO (Estilo Foto 5) */}
            <div className="cobalt-prnd-ladder">
              <div className="prnd-bracket-cobalt">
                <span className={`prnd-item-blue ${isPark ? 'prnd-active-blue' : ''}`}>P</span>
                <span className={`prnd-item-blue ${isReverse ? 'prnd-active-blue' : ''}`}>R</span>
                <span className={`prnd-item-blue ${isNeutral && !isPark ? 'prnd-active-blue' : ''}`}>N</span>
                <span className={`prnd-item-blue ${isDrive ? 'prnd-active-blue' : ''}`}>
                  {truck.displayedGear ? truck.displayedGear : 'D'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RÉGUA INFERIOR COM ÍCONES DE DIAGNÓSTICO (Estilo Foto 5) */}
        <div className="cobalt-bottom-diagnostics">
          <svg width="22" height="18" viewBox="0 0 24 24" fill="#38bdf8">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <line x1="6" y1="4" x2="6" y2="7" stroke="#38bdf8" strokeWidth="2" />
            <line x1="18" y1="4" x2="18" y2="7" stroke="#38bdf8" strokeWidth="2" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b">
            <path d="M12 2a9 9 0 0 0-9 9c0 5 9 11 9 11s9-6 9-11a9 9 0 0 0-9-9zm0 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm1 8h-2v-4h2v4z"/>
          </svg>
          <svg width="24" height="20" viewBox="0 0 24 24" fill="#f97316">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <svg width="22" height="20" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

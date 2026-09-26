import React from 'react';

/**
 * Modelo 4: Sport Red Racing (Baseado fielmente na Foto 4)
 * Cockpit esportivo noturno em vermelho carmim vibrante com aros concêntricos brilhantes,
 * agulhas vermelhas, placa circular de limite de velocidade europeia, seletor vertical
 * de marchas PRND, curvatura de combustível inferior e coluna central de alertas.
 */
export default function SkinSportRed({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};
  const game = data?.game || {};

  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  // 0 a 240 km/h mapeado de -130° a +130°
  const speedFraction = Math.min(1, Math.max(0, speed / 240));
  const speedNeedleDeg = -130 + speedFraction * 260;

  // 0 a 8 x1000 RPM mapeado de -130° a +130°
  const rpm = truck.rpm || 0;
  const rpmFraction = Math.min(1, Math.max(0, (rpm * 3.2) / 8000));
  const rpmNeedleDeg = -130 + rpmFraction * 260;

  // Combustível
  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelFraction = Math.min(1, Math.max(0, fuel / fuelCapacity));

  // Marcha atual (P, R, N, D)
  const gear = truck.gear || 0;
  const isReverse = gear < 0;
  const isNeutral = gear === 0;
  const isDrive = gear > 0;
  const isPark = truck.parkBrake && isNeutral;

  const odo = Math.round(truck.odometer || 4523);
  const rangeKm = Math.round((fuel / Math.max(1, truck.fuelAverageConsumption || 35)) * 100);

  return (
    <div className="skin-sportred-container">
      <div className="sportred-cluster-housing">
        {/* CABEÇALHO SUPERIOR (Temperatura, Chevron Central e Relógio) */}
        <div className="sportred-header-bar">
          <div className="sportred-temp">24 °C</div>
          
          {/* Chevron Esportivo Vermelho */}
          <div className="sportred-chevron-accent">
            <svg width="180" height="20" viewBox="0 0 180 20">
              <path d="M 10 18 L 80 4 L 90 14 L 100 4 L 170 18" fill="none" stroke="#dc2626" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="sportred-clock">{game.time || "13:55"}</div>
        </div>

        {/* ÁREA DOS DOIS INSTRUMENTOS PRINCIPAIS */}
        <div className="sportred-main-stage">
          
          {/* DIAL ESQUERDO: VELOCÍMETRO (0 - 240 km/h) */}
          <div className="sportred-dial sportred-dial-left">
            <svg viewBox="0 0 340 340" className="sportred-svg">
              <defs>
                <radialGradient id="sportred-radial-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0a0505" stopOpacity="0.95" />
                </radialGradient>
                <linearGradient id="sportred-needle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff4d4f" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
              </defs>

              {/* Fundo e Aros Vermelhos Duplos Concentricos */}
              <circle cx="170" cy="170" r="160" fill="url(#sportred-radial-glow)" stroke="#ef4444" strokeWidth="3" />
              <circle cx="170" cy="170" r="150" fill="none" stroke="#b91c1c" strokeWidth="1.5" strokeOpacity="0.6" />
              <circle cx="170" cy="170" r="140" fill="none" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3 5" />
              <circle cx="170" cy="170" r="82" fill="#030101" stroke="#dc2626" strokeWidth="2" />

              {/* Ticks e Números de 0 a 240 */}
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

              {/* Ponteiro Esportivo Vermelho */}
              <g transform={`rotate(${speedNeedleDeg} 170 170)`}>
                <polygon points="166,170 174,170 171,28 169,28" fill="url(#sportred-needle-grad)" />
                <line x1="170" y1="170" x2="170" y2="28" stroke="#ff7875" strokeWidth="1.5" />
              </g>
              <circle cx="170" cy="170" r="9" fill="#000000" stroke="#dc2626" strokeWidth="3" />
            </svg>

            {/* Display Central da Velocidade */}
            <div className="sportred-center-speed">
              <span className="sportred-speed-num" style={{ color: isOverSpeed ? '#ff4d4f' : '#ffffff' }}>
                {speed}
              </span>
              <span className="sportred-speed-unit">km/h</span>
            </div>

            {/* Placa Redonda Europeia de Limite de Velocidade no canto inferior direito */}
            <div className="sportred-speedlimit-sign">
              <span>{speedLimit}</span>
            </div>
          </div>

          {/* COLUNA CENTRAL COM TELLTALES VERTICAIS E SETAS */}
          <div className="sportred-center-column">
            {/* Ícones de Alerta Verticais */}
            <div className="sportred-telltale-stack">
              {/* Bateria */}
              <div className="sportred-icon-row">
                <svg width="22" height="18" viewBox="0 0 24 24" fill={truck.batteryVoltage < 23 ? "#ef4444" : "#451a1a"}>
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <line x1="6" y1="4" x2="6" y2="7" stroke="currentColor" strokeWidth="2" />
                  <line x1="18" y1="4" x2="18" y2="7" stroke="currentColor" strokeWidth="2" />
                </svg>
                {/* Pressão dos Pneus */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b">
                  <path d="M12 2a9 9 0 0 0-9 9c0 5 9 11 9 11s9-6 9-11a9 9 0 0 0-9-9zm0 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm1 8h-2v-4h2v4z"/>
                </svg>
              </div>

              {/* Óleo e Check Engine */}
              <div className="sportred-icon-row">
                <svg width="24" height="20" viewBox="0 0 24 24" fill="#f97316">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                <svg width="22" height="20" viewBox="0 0 24 24" fill="#ef4444">
                  <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                </svg>
              </div>

              {/* Freio de Estacionamento [P] */}
              <div className={`sportred-brake-pill ${truck.parkBrake ? 'active-park-red' : ''}`}>
                <span>(P)</span>
              </div>

              {/* Cinto de Segurança */}
              <div className="sportred-seatbelt-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5.5 21v-2a7 7 0 0 1 13 0v2" />
                  <line x1="7" y1="13" x2="17" y2="21" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </div>

            {/* Setas e Farol Alto na base da coluna central */}
            <div className="sportred-center-indicators">
              <svg 
                width="28" height="22" viewBox="0 0 24 24" 
                fill={lights.blinkerLeft ? "#f97316" : "#261313"}
                className={lights.blinkerLeft ? "blink-fast" : ""}
              >
                <polygon points="14,6 6,12 14,18" />
              </svg>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={lights.beamHigh ? "#3b82f6" : "#261313"}>
                <circle cx="12" cy="12" r="7" />
              </svg>
              <svg 
                width="28" height="22" viewBox="0 0 24 24" 
                fill={lights.blinkerRight ? "#f97316" : "#261313"}
                className={lights.blinkerRight ? "blink-fast" : ""}
              >
                <polygon points="10,6 18,12 10,18" />
              </svg>
            </div>
          </div>

          {/* DIAL DIREITO: TACÔMETRO (0 - 8 x1000 RPM) E SELETOR PRND */}
          <div className="sportred-dial sportred-dial-right">
            <svg viewBox="0 0 340 340" className="sportred-svg">
              <circle cx="170" cy="170" r="160" fill="url(#sportred-radial-glow)" stroke="#ef4444" strokeWidth="3" />
              <circle cx="170" cy="170" r="150" fill="none" stroke="#b91c1c" strokeWidth="1.5" strokeOpacity="0.6" />
              
              {/* Faixa Vermelha Tracejada de Redline (6 a 8) */}
              <path 
                d="M 270 170 A 140 140 0 0 1 200 300" 
                fill="none" 
                stroke="#ef4444" 
                strokeWidth="4" 
                strokeDasharray="4 4"
              />

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
                const isRed = v >= 6;
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isRed ? "#ef4444" : "#ffffff"} strokeWidth="2.5" />
                    <text x={tx} y={ty} fill={isRed ? "#f87171" : "#ffffff"} fontSize="17" fontWeight="700" textAnchor="middle" fontFamily="Inter">
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* Arco Inferior de Combustível com Traço Verde de Reserva */}
              <path d="M 100 280 A 120 120 0 0 1 240 280" fill="none" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
              <path d="M 100 280 A 120 120 0 0 1 130 288" fill="none" stroke="#22c55e" strokeWidth="4.5" strokeLinecap="round" />
              <path 
                d="M 100 280 A 120 120 0 0 1 240 280" 
                fill="none" 
                stroke="#ffffff" 
                strokeWidth="4" 
                strokeDasharray={`${fuelFraction * 135} 200`}
                strokeLinecap="round"
              />

              {/* Ponteiro de RPM */}
              <g transform={`rotate(${rpmNeedleDeg} 170 170)`}>
                <polygon points="166,170 174,170 171,28 169,28" fill="url(#sportred-needle-grad)" />
                <line x1="170" y1="170" x2="170" y2="28" stroke="#ff7875" strokeWidth="1.5" />
              </g>
              <circle cx="170" cy="170" r="82" fill="#030101" stroke="#dc2626" strokeWidth="2" />
            </svg>

            {/* SELETOR VERTICAL DE MARCHAS PRND NO CENTRO (Estilo Foto 4) */}
            <div className="sportred-prnd-ladder">
              <div className="prnd-bracket">
                <span className={`prnd-item ${isPark ? 'prnd-active' : ''}`}>P</span>
                <span className={`prnd-item ${isReverse ? 'prnd-active' : ''}`}>R</span>
                <span className={`prnd-item ${isNeutral && !isPark ? 'prnd-active' : ''}`}>N</span>
                <span className={`prnd-item ${isDrive ? 'prnd-active' : ''}`}>
                  {truck.displayedGear ? truck.displayedGear : 'D'}
                </span>
              </div>
            </div>

            {/* Legenda de Combustível (1/2, 1) */}
            <div className="sportred-fuel-legend">
              <span>⛽</span>
              <span>1/2</span>
            </div>
          </div>
        </div>

        {/* RODAPÉ: HODÔMETRO PARCIAL E AUTONOMIA (Estilo Foto 4) */}
        <div className="sportred-bottom-stats">
          <div className="sportred-trip-meter">
            <span>TM {odo}.0 km</span>
          </div>
          <div className="sportred-fuel-range">
            <span>➔ ⛽ {rangeKm} km</span>
          </div>
        </div>
      </div>
    </div>
  );
}

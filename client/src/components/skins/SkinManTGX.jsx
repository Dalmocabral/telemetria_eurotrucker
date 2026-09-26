import React from 'react';

/**
 * Modelo 10: MAN TGX Bavarian Lion Heavy-Duty
 * O imponente painel do MAN TGX em iluminação âmbar-laranja clássica da Baviera.
 * Traz tacômetro com faixa verde de torque ótimo do motor D38 (1000-1400 RPM),
 * manômetros duplos analógicos de circuitos de ar pneumático, marchas MAN TipMatic
 * e molduras reforçadas para transporte pesado.
 */
export default function SkinManTGX({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};
  const game = data?.game || {};

  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  // 0 a 130 km/h (-125° a +125°)
  const speedFraction = Math.min(1, Math.max(0, speed / 130));
  const speedNeedleDeg = -125 + speedFraction * 250;

  // 0 a 2500 RPM (-125° a +125°)
  const rpm = truck.rpm || 0;
  const rpmFraction = Math.min(1, Math.max(0, rpm / 2500));
  const rpmNeedleDeg = -125 + rpmFraction * 250;

  const airBar = (truck.brakeAirPressure || 8.5).toFixed(1);
  const airNeedleDeg = -45 + Math.min(1, (truck.brakeAirPressure || 8.5) / 12) * 90;

  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelFraction = Math.min(1, Math.max(0, fuel / fuelCapacity));

  return (
    <div className="skin-man-container">
      <div className="man-housing">
        {/* TOPO: LEÃO BÁVARO MAN E SETAS */}
        <div className="man-top-header">
          <div className={`man-blinker ${lights.blinkerLeft ? 'blink-amber' : ''}`}>
            ◀
          </div>

          <div className="man-lion-crest">
            <span className="lion-icon">🦁</span>
            <span className="man-brand">MAN TGX // INDIVIDUAL LION</span>
          </div>

          <div className={`man-blinker ${lights.blinkerRight ? 'blink-amber' : ''}`}>
            ▶
          </div>
        </div>

        {/* ÁREA DOS DOIS INSTRUMENTOS ÂMBAR */}
        <div className="man-gauges-row">
          
          {/* DIAL ESQUERDO: VELOCÍMETRO MAN (0 - 130 km/h) */}
          <div className="man-dial man-dial-left">
            <svg viewBox="0 0 300 300" className="man-svg">
              <defs>
                <linearGradient id="man-orange-needle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>

              <circle cx="150" cy="150" r="142" fill="#0c0a09" stroke="#78350f" strokeWidth="5" />
              <circle cx="150" cy="150" r="132" fill="#1c1917" stroke="#44403c" strokeWidth="2" />

              {/* Ticks e Números 0 a 130 */}
              {[0, 20, 40, 60, 80, 100, 120, 130].map((v) => {
                const f = v / 130;
                const angleDeg = -125 + f * 250;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const x1 = 150 + Math.cos(angleRad) * 115;
                const y1 = 150 + Math.sin(angleRad) * 115;
                const x2 = 150 + Math.cos(angleRad) * 128;
                const y2 = 150 + Math.sin(angleRad) * 128;
                const tx = 150 + Math.cos(angleRad) * 98;
                const ty = 150 + Math.sin(angleRad) * 98 + 5;
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fdba74" strokeWidth="2.5" />
                    <text x={tx} y={ty} fill="#fed7aa" fontSize="15" fontWeight="700" textAnchor="middle" fontFamily="Rajdhani">
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* Ponteiro Âmbar/Laranja */}
              <g transform={`rotate(${speedNeedleDeg} 150 150)`}>
                <line x1="150" y1="150" x2="150" y2="30" stroke="url(#man-orange-needle)" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="150" y1="150" x2="150" y2="30" stroke="#ffedd5" strokeWidth="1.5" />
              </g>
              <circle cx="150" cy="150" r="10" fill="#292524" stroke="#f97316" strokeWidth="2.5" />
            </svg>

            {/* Leitura Central de Velocidade */}
            <div className="man-dial-center">
              <span className="man-speed-val" style={{ color: isOverSpeed ? '#ef4444' : '#fed7aa' }}>
                {speed}
              </span>
              <span className="man-speed-unit">KM/H</span>
            </div>

            <div className="man-speed-badge">
              <span>{speedLimit} KM/H</span>
            </div>
          </div>

          {/* CENTRO: CAIXA TIPMATIC E MANÔMETROS DE AR */}
          <div className="man-center-module">
            <div className="man-tipmatic-card">
              <span className="tipmatic-title">MAN TIPMATIC</span>
              <div className="tipmatic-gear">{truck.displayedGear || 'D 12'}</div>
              <small>{truck.retarderLevel > 0 ? `PRIOTARDER R${truck.retarderLevel}` : 'CRUISE READY'}</small>
            </div>

            {/* Manômetro de Freio Pneumático */}
            <div className="man-air-gauge-box">
              <small>PRESSÃO PNEUMÁTICA</small>
              <div className="man-gauge-needle-mini">
                <svg width="100" height="45" viewBox="0 0 100 45">
                  <path d="M 20 40 A 35 35 0 0 1 80 40" fill="none" stroke="#44403c" strokeWidth="4" />
                  <g transform={`rotate(${airNeedleDeg} 50 40)`}>
                    <line x1="50" y1="40" x2="50" y2="10" stroke="#f97316" strokeWidth="2.5" />
                  </g>
                </svg>
              </div>
              <strong>{airBar} BAR</strong>
            </div>

            <div className="man-fuel-status">
              <span>DIESEL: {Math.round(fuel)} L ({Math.round(fuelFraction * 100)}%)</span>
            </div>
          </div>

          {/* DIAL DIREITO: TACÔMETRO (0 - 2500 RPM) COM FAIXA VERDE BÁVARA */}
          <div className="man-dial man-dial-right">
            <svg viewBox="0 0 300 300" className="man-svg">
              <circle cx="150" cy="150" r="142" fill="#0c0a09" stroke="#78350f" strokeWidth="5" />
              <circle cx="150" cy="150" r="132" fill="#1c1917" stroke="#44403c" strokeWidth="2" />

              {/* Faixa Verde de Torque Máximo MAN (1000 a 1400 RPM) */}
              <path 
                d="M 98 52 A 115 115 0 0 1 178 48" 
                fill="none" 
                stroke="#22c55e" 
                strokeWidth="7" 
                strokeLinecap="round" 
              />

              {/* Ticks 0 a 25 */}
              {[0, 5, 10, 15, 20, 25].map((v) => {
                const f = (v * 100) / 2500;
                const angleDeg = -125 + f * 250;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const x1 = 150 + Math.cos(angleRad) * 115;
                const y1 = 150 + Math.sin(angleRad) * 115;
                const x2 = 150 + Math.cos(angleRad) * 128;
                const y2 = 150 + Math.sin(angleRad) * 128;
                const tx = 150 + Math.cos(angleRad) * 98;
                const ty = 150 + Math.sin(angleRad) * 98 + 5;
                const isGreen = v >= 10 && v <= 15;
                const isRed = v >= 22;
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isRed ? "#ef4444" : isGreen ? "#22c55e" : "#fdba74"} strokeWidth="2.5" />
                    <text x={tx} y={ty} fill={isRed ? "#f87171" : isGreen ? "#4ade80" : "#fed7aa"} fontSize="15" fontWeight="700" textAnchor="middle" fontFamily="Rajdhani">
                      {v}
                    </text>
                  </g>
                );
              })}

              <g transform={`rotate(${rpmNeedleDeg} 150 150)`}>
                <line x1="150" y1="150" x2="150" y2="30" stroke="url(#man-orange-needle)" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="150" y1="150" x2="150" y2="30" stroke="#ffedd5" strokeWidth="1.5" />
              </g>
              <circle cx="150" cy="150" r="10" fill="#292524" stroke="#f97316" strokeWidth="2.5" />
            </svg>

            <div className="man-dial-center">
              <span className="man-speed-val" style={{ color: '#fdba74' }}>
                {rpm}
              </span>
              <span className="man-speed-unit">RPM D38</span>
            </div>

            <div className="man-speed-badge">
              <span>{Math.round(truck.waterTemperature || 85)} °C ÁGUA</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

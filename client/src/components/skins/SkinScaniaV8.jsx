import React from 'react';

/**
 * Modelo 6: Scania V8 King of the Road
 * O lendário painel Scania NextGen V8 em titânio escovado, dourado e âmbar profundo.
 * Inclui manômetros duplos de pressão pneumática dos freios (Bar 1 e Bar 2),
 * emblema V8 central, estágio do Retarder e indicador de caixa automatizada Opticruise.
 */
export default function SkinScaniaV8({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};

  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  // 0 a 140 km/h (escala clássica de caminhão pesado europeu)
  const speedFraction = Math.min(1, Math.max(0, speed / 140));
  const speedNeedleDeg = -120 + speedFraction * 240;

  // Tacômetro de caminhão: 0 a 2500 RPM com faixa verde de torque V8 (1000 a 1500 RPM)
  const rpm = truck.rpm || 0;
  const rpmFraction = Math.min(1, Math.max(0, rpm / 2500));
  const rpmNeedleDeg = -120 + rpmFraction * 240;

  // Pressão de ar dos freios (normalmente 8 a 12 bar no caminhão)
  const airBar = (truck.brakeAirPressure || 8.5).toFixed(1);
  const airFraction = Math.min(1, Math.max(0, (truck.brakeAirPressure || 8.5) / 12));

  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelFraction = Math.min(1, Math.max(0, fuel / fuelCapacity));

  return (
    <div className="skin-scania-container">
      <div className="scania-housing">
        {/* TOPO: EMBLEMA SCANIA V8 E SETAS DOURADAS */}
        <div className="scania-top-bar">
          <div className={`scania-blinker ${lights.blinkerLeft ? 'blink-active' : ''}`}>
            ◀
          </div>

          <div className="scania-v8-crown-badge">
            <span className="v8-crown">👑</span>
            <span className="v8-text">SCANIA V8</span>
          </div>

          <div className={`scania-blinker ${lights.blinkerRight ? 'blink-active' : ''}`}>
            ▶
          </div>
        </div>

        {/* ÁREA DOS DOIS GRANDES MOSTRADORES ANGULARES */}
        <div className="scania-main-gauges">
          
          {/* VELOCÍMETRO SCANIA (0 - 140 km/h) */}
          <div className="scania-dial scania-dial-left">
            <svg viewBox="0 0 320 320" className="scania-svg">
              <defs>
                <linearGradient id="scania-gold-needle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#a16207" />
                </linearGradient>
              </defs>

              {/* Bisel Octogonal Scania com Borda Dourada */}
              <polygon 
                points="90,10 230,10 310,90 310,230 230,310 90,310 10,230 10,90"
                fill="#0f172a" 
                stroke="#ca8a04" 
                strokeWidth="4" 
              />
              <circle cx="160" cy="160" r="135" fill="#020617" stroke="#334155" strokeWidth="2" />

              {/* Arco Âmbar de Velocidade */}
              <path d="M 55 225 A 120 120 0 1 1 265 225" fill="none" stroke="#eab308" strokeWidth="4" strokeOpacity="0.8" />

              {/* Ticks 0 a 140 km/h */}
              {[0, 20, 40, 60, 80, 100, 120, 140].map((v) => {
                const f = v / 140;
                const angleDeg = -120 + f * 240;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const x1 = 160 + Math.cos(angleRad) * 115;
                const y1 = 160 + Math.sin(angleRad) * 115;
                const x2 = 160 + Math.cos(angleRad) * 128;
                const y2 = 160 + Math.sin(angleRad) * 128;
                const tx = 160 + Math.cos(angleRad) * 96;
                const ty = 160 + Math.sin(angleRad) * 96 + 5;
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#facc15" strokeWidth="3" />
                    <text x={tx} y={ty} fill="#fef08a" fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="Rajdhani">
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* Ponteiro Dourado Scania */}
              <g transform={`rotate(${speedNeedleDeg} 160 160)`}>
                <line x1="160" y1="160" x2="160" y2="35" stroke="url(#scania-gold-needle)" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="160" y1="160" x2="160" y2="35" stroke="#ffffff" strokeWidth="1.5" />
              </g>
              <circle cx="160" cy="160" r="12" fill="#1e293b" stroke="#ca8a04" strokeWidth="3" />
            </svg>

            {/* Display Digital de Velocidade */}
            <div className="scania-center-display">
              <span className="scania-speed-digit" style={{ color: isOverSpeed ? '#ef4444' : '#fef08a' }}>
                {speed}
              </span>
              <span className="scania-speed-sub">KM/H</span>
            </div>

            {/* Placa de Limite de Velocidade Scania */}
            <div className="scania-limit-pill">
              <span>{speedLimit}</span>
            </div>
          </div>

          {/* PAINEL CENTRAL MULTIFUNÇÃO V8 OPTICRUISE */}
          <div className="scania-center-cluster">
            {/* Marcha Opticruise */}
            <div className="scania-opticruise-card">
              <small>OPTICRUISE</small>
              <div className="opticruise-gear">
                {truck.displayedGear || 'D12'}
              </div>
              <span className="opticruise-sub">
                {truck.retarderLevel > 0 ? `RETARDER R${truck.retarderLevel}` : 'CRUISE READY'}
              </span>
            </div>

            {/* Manômetros Duplos de Freio Pneumático (Ar 1 & Ar 2) */}
            <div className="scania-air-tanks">
              <div className="air-tank-item">
                <span className="tank-label">AR FREIO 1</span>
                <div className="tank-bar-track">
                  <div className="tank-bar-fill" style={{ width: `${airFraction * 100}%` }} />
                </div>
                <strong className="tank-val">{airBar} bar</strong>
              </div>
              <div className="air-tank-item">
                <span className="tank-label">AR FREIO 2</span>
                <div className="tank-bar-track">
                  <div className="tank-bar-fill" style={{ width: `${Math.min(100, airFraction * 105)}%` }} />
                </div>
                <strong className="tank-val">{airBar} bar</strong>
              </div>
            </div>

            {/* Temperatura e Hodômetro */}
            <div className="scania-substats">
              <span>ÁGUA: {Math.round(truck.waterTemperature || 85)}°C</span>
              <span>ÓLEO: {Math.round(truck.oilTemperature || 90)}°C</span>
            </div>
          </div>

          {/* TACÔMETRO SCANIA V8 COM FAIXA VERDE DE ECONOMIA (1000 - 1500 RPM) */}
          <div className="scania-dial scania-dial-right">
            <svg viewBox="0 0 320 320" className="scania-svg">
              <polygon 
                points="90,10 230,10 310,90 310,230 230,310 90,310 10,230 10,90"
                fill="#0f172a" 
                stroke="#ca8a04" 
                strokeWidth="4" 
              />
              <circle cx="160" cy="160" r="135" fill="#020617" stroke="#334155" strokeWidth="2" />

              {/* Faixa Verde de Torque Máximo do V8 (1000 a 1500 RPM) */}
              <path 
                d="M 105 52 A 120 120 0 0 1 190 48" 
                fill="none" 
                stroke="#22c55e" 
                strokeWidth="8" 
                strokeLinecap="round" 
              />

              {/* Ticks 0 a 25 (x100 RPM) */}
              {[0, 5, 10, 15, 20, 25].map((v) => {
                const f = (v * 100) / 2500;
                const angleDeg = -120 + f * 240;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const x1 = 160 + Math.cos(angleRad) * 115;
                const y1 = 160 + Math.sin(angleRad) * 115;
                const x2 = 160 + Math.cos(angleRad) * 128;
                const y2 = 160 + Math.sin(angleRad) * 128;
                const tx = 160 + Math.cos(angleRad) * 96;
                const ty = 160 + Math.sin(angleRad) * 96 + 5;
                const isGreen = v >= 10 && v <= 15;
                const isRed = v >= 22;
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isRed ? "#ef4444" : isGreen ? "#22c55e" : "#facc15"} strokeWidth="3" />
                    <text x={tx} y={ty} fill={isRed ? "#f87171" : isGreen ? "#4ade80" : "#fef08a"} fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="Rajdhani">
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* Ponteiro Scania */}
              <g transform={`rotate(${rpmNeedleDeg} 160 160)`}>
                <line x1="160" y1="160" x2="160" y2="35" stroke="url(#scania-gold-needle)" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="160" y1="160" x2="160" y2="35" stroke="#ffffff" strokeWidth="1.5" />
              </g>
              <circle cx="160" cy="160" r="12" fill="#1e293b" stroke="#ca8a04" strokeWidth="3" />
            </svg>

            {/* Display Central RPM */}
            <div className="scania-center-display">
              <span className="scania-speed-digit scania-rpm-gold">
                {rpm}
              </span>
              <span className="scania-speed-sub">RPM V8</span>
            </div>

            {/* Tanque de Diesel Inferior */}
            <div className="scania-fuel-bottom">
              <span>⛽ {Math.round(fuel)} L ({Math.round(fuelFraction * 100)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

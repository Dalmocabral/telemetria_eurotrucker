import React from 'react';

/**
 * Modelo 9: Mercedes-Benz Actros Multimedia Cockpit
 * O cockpit digital panorâmico da Mercedes-Benz Trucks em cinza platina e ardósia.
 * Inclui assistente de faixa Active Drive Assist com projeção de distância,
 * anel digital concêntrico de velocidade, medidor Eco Support e telemetria Powershift 3.
 */
export default function SkinActros({ data }) {
  const truck = data?.truck || {};
  const game = data?.game || {};

  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  const rpm = truck.rpm || 0;
  const rpmPercent = Math.min(100, (rpm / 2400) * 100);

  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelPercent = Math.min(100, Math.max(0, (fuel / fuelCapacity) * 100));

  return (
    <div className="skin-actros-container">
      <div className="actros-cockpit-frame">
        {/* CABEÇALHO MERCEDES COM ESTRELA */}
        <div className="actros-top-header">
          <div className="actros-star-brand">
            <span className="star-icon">⭐</span>
            <span>MERCEDES-BENZ ACTROS</span>
          </div>
          <div className="actros-clock-box">
            <span>{game.time || "14:30"}</span>
          </div>
        </div>

        {/* ÁREA MULTIMEDIA COCKPIT */}
        <div className="actros-screen-grid">
          
          {/* LADO ESQUERDO: VELOCÍMETRO CIRCULAR COM ANEL PLATINA */}
          <div className="actros-card actros-speed-pod">
            <svg viewBox="0 0 260 260" className="actros-svg">
              <circle cx="130" cy="130" r="115" fill="#090d16" stroke="#1e293b" strokeWidth="4" />
              {/* Arco Platina de Velocidade */}
              <path 
                d="M 40 185 A 105 105 0 1 1 220 185" 
                fill="none" 
                stroke="#334155" 
                strokeWidth="10" 
                strokeLinecap="round" 
              />
              <path 
                d="M 40 185 A 105 105 0 1 1 220 185" 
                fill="none" 
                stroke="#f8fafc" 
                strokeWidth="10" 
                strokeDasharray={`${(speed / 140) * 190} 300`}
                strokeLinecap="round" 
              />
            </svg>

            <div className="actros-dial-center">
              <span className="actros-speed-num" style={{ color: isOverSpeed ? '#f43f5e' : '#ffffff' }}>
                {speed}
              </span>
              <span className="actros-speed-unit">km/h</span>
              <div className="actros-speedlimit-tag">LIMITE {speedLimit}</div>
            </div>

            {/* Combustível */}
            <div className="actros-pod-footer">
              <span>DIESEL</span>
              <div className="actros-mini-bar">
                <div className="actros-bar-fill" style={{ width: `${fuelPercent}%` }} />
              </div>
              <small>{Math.round(fuel)} L</small>
            </div>
          </div>

          {/* CENTRO: ASSISTÊNCIA DE CONDUÇÃO ADAS (Active Drive Assist) */}
          <div className="actros-card actros-center-adas">
            <div className="adas-header">ACTIVE DRIVE ASSIST</div>
            
            {/* Gráfico de Estrada em Perspectiva com Faixas de Rodagem */}
            <div className="adas-road-perspective">
              <svg width="180" height="110" viewBox="0 0 180 110">
                {/* Linhas de faixa da rodovia */}
                <line x1="20" y1="110" x2="70" y2="20" stroke="#38bdf8" strokeWidth="3" />
                <line x1="160" y1="110" x2="110" y2="20" stroke="#38bdf8" strokeWidth="3" />
                {/* Linha tracejada central */}
                <line x1="90" y1="110" x2="90" y2="20" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6 6" />
                {/* Indicador de Distância do Veículo à Frente */}
                <rect x="75" y="28" width="30" height="14" rx="3" fill="#22c55e" opacity="0.85" />
              </svg>
            </div>

            {/* Transmissão Powershift 3 e Cruise Control */}
            <div className="actros-powershift-box">
              <div className="powershift-gear">{truck.displayedGear || 'A 12'}</div>
              <div className="powershift-sub">POWERSHIFT 3</div>
            </div>

            <div className="actros-adas-status">
              <span>CRUISE: <strong>{truck.cruiseControl ? `${truck.cruiseControlSpeed} km/h` : 'STANDBY'}</strong></span>
            </div>
          </div>

          {/* LADO DIREITO: TACÔMETRO E ECO SUPPORT */}
          <div className="actros-card actros-rpm-pod">
            <svg viewBox="0 0 260 260" className="actros-svg">
              <circle cx="130" cy="130" r="115" fill="#090d16" stroke="#1e293b" strokeWidth="4" />
              <path 
                d="M 40 185 A 105 105 0 1 1 220 185" 
                fill="none" 
                stroke="#334155" 
                strokeWidth="10" 
                strokeLinecap="round" 
              />
              <path 
                d="M 40 185 A 105 105 0 1 1 220 185" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="10" 
                strokeDasharray={`${(rpmPercent / 100) * 190} 300`}
                strokeLinecap="round" 
              />
            </svg>

            <div className="actros-dial-center">
              <span className="actros-speed-num" style={{ color: '#38bdf8' }}>
                {rpm}
              </span>
              <span className="actros-speed-unit">RPM</span>
              <div className="actros-speedlimit-tag">ECO SUPPORT: 98%</div>
            </div>

            {/* Temperatura do Motor */}
            <div className="actros-pod-footer">
              <span>TEMP MOTOR</span>
              <div className="actros-mini-bar">
                <div className="actros-bar-fill" style={{ width: `${Math.min(100, ((truck.waterTemperature || 85) / 110) * 100)}%`, background: '#38bdf8' }} />
              </div>
              <small>{Math.round(truck.waterTemperature || 85)} °C</small>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

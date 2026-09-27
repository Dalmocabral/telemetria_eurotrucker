import React from 'react';

/**
 * Modelo 7: Volvo FH Globetrotter I-Cockpit
 * O painel escandinavo de última geração do Volvo FH16 em turquesa cristalino,
 * titânio e prata. Possui barras de potência dinâmicas, silhueta do caminhão
 * no computador de bordo central, indicadores de freio motor VEB+ e assistência de faixa.
 */
export default function SkinVolvoFH({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};

  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  const rpm = truck.rpm || 0;
  const rpmPercent = Math.min(100, (rpm / 2400) * 100);

  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelPercent = Math.min(100, Math.max(0, (fuel / fuelCapacity) * 100));

  const odo = Math.round(truck.odometer || 184500);

  return (
    <div className="skin-volvo-container">
      <div className="volvo-cockpit-housing">
        {/* TOPO: VOLVO IRON MARK E LUZES ESCANDINAVAS */}
        <div className="volvo-top-bar">
          <div className={`volvo-arrow ${lights.blinkerLeft ? 'blink-active' : ''}`}>
            ◀
          </div>
          
          <div className="volvo-iron-mark">
            <span className="iron-mark-circle">⚪</span>
            <span className="volvo-text">VOLVO FH GLOBETROTTER</span>
          </div>

          <div className={`volvo-arrow ${lights.blinkerRight ? 'blink-active' : ''}`}>
            ▶
          </div>
        </div>

        {/* CORPO PRINCIPAL COM ARCOS TURQUESA E COMPUTADOR CENTRAL */}
        <div className="volvo-main-grid">
          
          {/* LADO ESQUERDO: ARCO DIGITAL DE VELOCIDADE */}
          <div className="volvo-arc-pod volvo-left-pod">
            <svg viewBox="0 0 280 280" className="volvo-svg">
              <defs>
                <linearGradient id="volvo-cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>

              <circle cx="140" cy="140" r="125" fill="#030712" stroke="#1e293b" strokeWidth="6" />
              {/* Arco Fundo */}
              <path d="M 45 200 A 110 110 0 1 1 235 200" fill="none" stroke="#0f172a" strokeWidth="12" strokeLinecap="round" />
              {/* Arco Ativo de Velocidade */}
              <path 
                d="M 45 200 A 110 110 0 1 1 235 200" 
                fill="none" 
                stroke="url(#volvo-cyan-glow)" 
                strokeWidth="12" 
                strokeDasharray={`${(speed / 140) * 200} 300`}
                strokeLinecap="round" 
              />
            </svg>

            {/* Leitura Central de Velocidade */}
            <div className="volvo-pod-center">
              <span className="volvo-main-speed" style={{ color: isOverSpeed ? '#f43f5e' : '#ffffff' }}>
                {speed}
              </span>
              <span className="volvo-main-unit">km/h</span>
              <span className="volvo-speed-limit">LIMITE {speedLimit}</span>
            </div>

            {/* Barra Inferior de Combustível */}
            <div className="volvo-fuel-strip">
              <span>DIESEL</span>
              <div className="volvo-fuel-bar">
                <div className="volvo-fuel-fill" style={{ width: `${fuelPercent}%` }} />
              </div>
              <strong>{Math.round(fuel)} L</strong>
            </div>
          </div>

          {/* CENTRO: COMPUTADOR DE BORDO I-COCKPIT COM SILHUETA DO CAMINHÃO */}
          <div className="volvo-center-computer">
            {/* Silhueta Gráfica do Caminhão Volvo */}
            <div className="volvo-truck-silhouette">
              <svg width="120" height="70" viewBox="0 0 120 70">
                {/* Cabine FH */}
                <path d="M 20 60 L 20 30 L 35 15 L 75 15 L 85 30 L 105 30 L 105 60 Z" fill="#0f172a" stroke="#00e5ff" strokeWidth="2" />
                {/* Janela */}
                <polygon points="38,20 72,20 72,32 30,32" fill="#00e5ff" opacity="0.35" />
                {/* Rodas */}
                <circle cx="35" cy="60" r="10" fill="#020617" stroke="#00e5ff" strokeWidth="2" />
                <circle cx="90" cy="60" r="10" fill="#020617" stroke="#00e5ff" strokeWidth="2" />
              </svg>
            </div>

            {/* Marcha I-Shift e Status */}
            <div className="volvo-ishift-box">
              <div className="ishift-label">I-SHIFT</div>
              <div className="ishift-gear">{truck.displayedGear || 'A12'}</div>
              <div className="ishift-veb">{truck.retarderLevel > 0 ? `VEB+ ESTÁGIO ${truck.retarderLevel}` : 'VEB+ PRONTO'}</div>
            </div>

            {/* Informações de Viagem e Cruise */}
            <div className="volvo-info-rows">
              <div className="volvo-row">
                <span>CRUISE CONTROL</span>
                <strong>{truck.cruiseControl ? `${truck.cruiseControlSpeed} km/h` : 'OFF'}</strong>
              </div>
              <div className="volvo-row">
                <span>HODÔMETRO</span>
                <strong>{odo} km</strong>
              </div>
              <div className="volvo-row">
                <span>PRESSÃO DE AR</span>
                <strong>{(truck.brakeAirPressure || 8.5).toFixed(1)} bar</strong>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: TACÔMETRO E POTÊNCIA DINÂMICA (I-TORQUE) */}
          <div className="volvo-arc-pod volvo-right-pod">
            <svg viewBox="0 0 280 280" className="volvo-svg">
              <circle cx="140" cy="140" r="125" fill="#030712" stroke="#1e293b" strokeWidth="6" />
              <path d="M 45 200 A 110 110 0 1 1 235 200" fill="none" stroke="#0f172a" strokeWidth="12" strokeLinecap="round" />
              {/* Arco de RPM */}
              <path 
                d="M 45 200 A 110 110 0 1 1 235 200" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="12" 
                strokeDasharray={`${(rpmPercent / 100) * 200} 300`}
                strokeLinecap="round" 
              />
            </svg>

            <div className="volvo-pod-center">
              <span className="volvo-main-speed" style={{ color: '#38bdf8' }}>
                {rpm}
              </span>
              <span className="volvo-main-unit">RPM</span>
              <span className="volvo-speed-limit">I-SAVE TURBO</span>
            </div>

            {/* Temperatura do Motor */}
            <div className="volvo-fuel-strip">
              <span>TEMP MOTOR</span>
              <div className="volvo-fuel-bar">
                <div className="volvo-fuel-fill" style={{ width: `${Math.min(100, ((truck.waterTemperature || 85) / 110) * 100)}%`, background: '#38bdf8' }} />
              </div>
              <strong>{Math.round(truck.waterTemperature || 85)} °C</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

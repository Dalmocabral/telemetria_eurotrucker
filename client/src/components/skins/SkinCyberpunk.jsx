import React from 'react';

/**
 * Modelo 8: Cyberpunk 2077 Synthwave
 * Design futurista radical em neon magenta (#f43f5e) e ciano elétrico (#00e5ff),
 * com grade de perspectiva synthwave, velocímetro digital segmentado,
 * barras de LED de RPM angulares e telemetria de alta energia estilo Night City.
 */
export default function SkinCyberpunk({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};
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
    <div className="skin-cyberpunk-container">
      {/* Grade de perspectiva Synthwave de fundo */}
      <div className="cyberpunk-grid-bg" />

      <div className="cyberpunk-cockpit">
        {/* CABEÇALHO CIBERNÉTICO */}
        <div className="cyberpunk-top-header">
          <div className="cyber-status-tag">SYSTEM: ONLINE</div>
          <div className="cyber-title">CYBERTRUCK // PROTOCOL 2077</div>
          <div className="cyber-clock">{game.time || "23:42"}</div>
        </div>

        {/* ÁREA CENTRAL PRINCIPAL */}
        <div className="cyberpunk-main-stage">
          
          {/* PAINEL ESQUERDO: VELOCÍMETRO DIGITAL COM LED BARS */}
          <div className="cyber-panel cyber-speed-panel">
            <div className="cyber-panel-tag">VELOCIDADE_KMH</div>
            
            <div className="cyber-speed-huge" style={{ color: isOverSpeed ? '#ff0055' : '#00e5ff' }}>
              {speed}
            </div>

            <div className="cyber-speed-limit-badge">
              <span>MAX_LIMIT // {speedLimit} KM/H</span>
            </div>

            {/* Barras de Combustível em Segmentos de LED */}
            <div className="cyber-segmented-group">
              <span className="cyber-seg-label">COMBUSTÍVEL / DIESEL</span>
              <div className="cyber-led-blocks">
                {Array.from({ length: 16 }).map((_, i) => {
                  const isActive = (i / 16) * 100 <= fuelPercent;
                  return (
                    <div 
                      key={i} 
                      className={`cyber-led-block ${isActive ? 'active-block' : ''}`}
                    />
                  );
                })}
              </div>
              <small>{Math.round(fuel)} L RESTANTE</small>
            </div>
          </div>

          {/* CENTRO: NÚCLEO DE CONTROLE E MARCHA */}
          <div className="cyber-panel cyber-center-core">
            <div className="cyber-core-circle">
              <div className="core-gear-display">
                {truck.displayedGear || 'D'}
              </div>
              <span className="core-gear-sub">GEAR_LOCK</span>
            </div>

            {/* Setas Cyberpunk */}
            <div className="cyber-turn-signals">
              <span className={`cyber-arrow ${lights.blinkerLeft ? 'blink-cyan' : ''}`}>◀◀</span>
              <span className={`cyber-arrow ${lights.blinkerRight ? 'blink-cyan' : ''}`}>▶▶</span>
            </div>

            {/* Diagnóstico de Temperatura e Pressão */}
            <div className="cyber-sub-telemetry">
              <div className="cyber-stat-box">
                <small>COOLANT_TEMP</small>
                <strong>{Math.round(truck.waterTemperature || 85)} °C</strong>
              </div>
              <div className="cyber-stat-box">
                <small>BRAKE_AIR</small>
                <strong>{(truck.brakeAirPressure || 8.5).toFixed(1)} BAR</strong>
              </div>
            </div>
          </div>

          {/* PAINEL DIREITO: TACÔMETRO DE LED ANGULAR */}
          <div className="cyber-panel cyber-rpm-panel">
            <div className="cyber-panel-tag">MOTOR_RPM</div>
            
            <div className="cyber-rpm-huge">
              {rpm}
            </div>

            <div className="cyber-speed-limit-badge">
              <span>TURBO_BOOST // ACTIVE</span>
            </div>

            {/* Barras de RPM de LED */}
            <div className="cyber-segmented-group">
              <span className="cyber-seg-label">POTÊNCIA / TACO</span>
              <div className="cyber-led-blocks">
                {Array.from({ length: 16 }).map((_, i) => {
                  const isActive = (i / 16) * 100 <= rpmPercent;
                  const isRed = i >= 13;
                  return (
                    <div 
                      key={i} 
                      className={`cyber-led-block ${isActive ? (isRed ? 'active-red' : 'active-block') : ''}`}
                    />
                  );
                })}
              </div>
              <small>{(rpm / 1000).toFixed(1)}K RPM / TURBOCHARGED</small>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

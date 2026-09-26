import React from 'react';

/**
 * Modelo 3: Carbon Fiber Classic 4-Gauge (Baseado fielmente na Foto 3)
 * Painel esportivo clássico com acabamento em fibra de carbono, 4 medidores analógicos
 * com agulhas azuis luminosas (Temp, RPM, Velocidade e Combustível), leds de serviço
 * de inspeção, hodômetro digital e régua completa de luzes de alerta.
 */
export default function SkinCarbonClassic({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};

  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;

  // Medidor de Velocidade (0 a 220 km/h: -125° a +125°)
  const speedFraction = Math.min(1, Math.max(0, speed / 220));
  const speedNeedleDeg = -125 + speedFraction * 250;

  // Medidor de RPM (0 a 6000 RPM: -125° a +125°)
  const rpm = truck.rpm || 0;
  const rpmFraction = Math.min(1, Math.max(0, (rpm * 2.4) / 6000));
  const rpmNeedleDeg = -125 + rpmFraction * 250;

  // Medidor de Temperatura (50 a 140°C: -60° a +60°)
  const waterTemp = Math.round(truck.waterTemperature || 85);
  const tempFraction = Math.min(1, Math.max(0, (waterTemp - 50) / 90));
  const tempNeedleDeg = -60 + tempFraction * 120;

  // Medidor de Combustível (E a F: -60° a +60°)
  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelFraction = Math.min(1, Math.max(0, fuel / fuelCapacity));
  const fuelNeedleDeg = -60 + fuelFraction * 120;

  const odo = Math.round(truck.odometer || 300250);

  return (
    <div className="skin-carbon-container">
      <div className="carbon-cluster-housing">
        {/* LUZES SUPERIORES (Setas Verdes e Telltales) */}
        <div className="carbon-top-header">
          {/* Luz de Porta Aberta */}
          <div className="carbon-telltale-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
              <rect x="6" y="4" width="12" height="16" rx="2" />
              <line x1="6" y1="12" x2="8" y2="12" />
              <line x1="16" y1="12" x2="18" y2="12" />
            </svg>
          </div>

          {/* Seta Esquerda */}
          <div className={`carbon-blinker-arrow ${lights.blinkerLeft ? 'blink-active' : ''}`}>
            <svg width="28" height="20" viewBox="0 0 24 24" fill="#22c55e">
              <polygon points="12,4 2,12 12,20 12,15 22,15 22,9 12,9" />
            </svg>
          </div>

          {/* Óleo e Bateria no Centro */}
          <div className="carbon-center-icons">
            <svg width="20" height="18" viewBox="0 0 24 24" fill="#38bdf8">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <svg width="20" height="18" viewBox="0 0 24 24" fill="#ef4444">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <line x1="6" y1="4" x2="6" y2="7" stroke="#ef4444" strokeWidth="2" />
              <line x1="18" y1="4" x2="18" y2="7" stroke="#ef4444" strokeWidth="2" />
            </svg>
          </div>

          {/* Seta Direita */}
          <div className={`carbon-blinker-arrow ${lights.blinkerRight ? 'blink-active' : ''}`}>
            <svg width="28" height="20" viewBox="0 0 24 24" fill="#22c55e">
              <polygon points="12,4 22,12 12,20 12,15 2,15 2,9 12,9" />
            </svg>
          </div>

          {/* Alerta de Freio Exclamação */}
          <div className="carbon-telltale-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <circle cx="12" cy="16" r="0.5" fill="#f43f5e" />
            </svg>
          </div>
        </div>

        {/* PALCO CENTRAL DOS 4 MEDIDORES ANALÓGICOS */}
        <div className="carbon-four-gauges-row">
          
          {/* GAUGE 1: TEMPERATURA DA ÁGUA (Pequeno Esquerdo) */}
          <div className="carbon-gauge-sm carbon-gauge-temp">
            <svg viewBox="0 0 140 140" className="carbon-svg">
              <defs>
                <pattern id="carbon-pat-1" width="6" height="6" patternUnits="userSpaceOnUse">
                  <rect width="3" height="3" fill="#18181b" />
                  <rect x="3" width="3" height="3" fill="#27272a" />
                  <rect y="3" width="3" height="3" fill="#27272a" />
                  <rect x="3" y="3" width="3" height="3" fill="#18181b" />
                </pattern>
              </defs>
              <circle cx="70" cy="70" r="66" fill="url(#carbon-pat-1)" stroke="#3f3f46" strokeWidth="3" />
              {/* Arco Luminoso Azul */}
              <path d="M 28 85 A 50 50 0 0 1 112 85" fill="none" stroke="#00e5ff" strokeWidth="3" strokeOpacity="0.8" />
              {/* Tracinhos 50, 90, 140 */}
              <line x1="28" y1="85" x2="35" y2="80" stroke="#fff" strokeWidth="2" />
              <line x1="70" y1="20" x2="70" y2="28" stroke="#fff" strokeWidth="2.5" />
              <line x1="112" y1="85" x2="105" y2="80" stroke="#ef4444" strokeWidth="2.5" />
              <text x="24" y="96" fill="#cbd5e1" fontSize="11" fontWeight="700">50</text>
              <text x="70" y="42" fill="#cbd5e1" fontSize="11" fontWeight="700" textAnchor="middle">90</text>
              <text x="114" y="96" fill="#f87171" fontSize="11" fontWeight="700" textAnchor="end">140</text>
              <text x="70" y="60" fill="#38bdf8" fontSize="10" textAnchor="middle">°C</text>
              {/* Ponteiro Azul */}
              <g transform={`rotate(${tempNeedleDeg} 70 70)`}>
                <line x1="70" y1="70" x2="70" y2="22" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" />
                <circle cx="70" cy="70" r="5" fill="#ffffff" />
              </g>
            </svg>
          </div>

          {/* GAUGE 2: TACÔMETRO / RPM (Grande Centro-Esquerdo) */}
          <div className="carbon-gauge-lg carbon-gauge-rpm">
            <svg viewBox="0 0 280 280" className="carbon-svg">
              <circle cx="140" cy="140" r="135" fill="url(#carbon-pat-1)" stroke="#52525b" strokeWidth="4" />
              {/* Arco Luminoso Ciano */}
              <path d="M 45 205 A 115 115 0 1 1 235 205" fill="none" stroke="#00e5ff" strokeWidth="5" strokeOpacity="0.85" />
              {/* Arco Vermelho Redline (4.5 a 6) */}
              <path d="M 195 75 A 115 115 0 0 1 235 205" fill="none" stroke="#ef4444" strokeWidth="5.5" />

              {/* Ticks e Números 1 a 6 */}
              {[1, 2, 3, 4, 5, 6].map((v) => {
                const f = (v - 1) / 5;
                const angleDeg = -125 + f * 250;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const x1 = 140 + Math.cos(angleRad) * 110;
                const y1 = 140 + Math.sin(angleRad) * 110;
                const x2 = 140 + Math.cos(angleRad) * 122;
                const y2 = 140 + Math.sin(angleRad) * 122;
                const tx = 140 + Math.cos(angleRad) * 92;
                const ty = 140 + Math.sin(angleRad) * 92 + 5;
                const isRed = v >= 5;
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isRed ? "#ef4444" : "#ffffff"} strokeWidth="3" />
                    <text x={tx} y={ty} fill={isRed ? "#f87171" : "#ffffff"} fontSize="17" fontWeight="800" textAnchor="middle" fontFamily="Inter">
                      {v}
                    </text>
                  </g>
                );
              })}

              <text x="140" y="115" fill="#94a3b8" fontSize="12" fontWeight="600" textAnchor="middle">x 1000</text>

              {/* Ícones de Farol e Freio de Mão no fundo do disco */}
              <g transform="translate(85, 155)">
                <circle cx="12" cy="12" r="10" fill={truck.parkBrake ? "#ef4444" : "#27272a"} />
                <text x="12" y="16" fill="#fff" fontSize="11" fontWeight="800" textAnchor="middle">P</text>
              </g>

              {/* Ponteiro Azul com Tampa Branca */}
              <g transform={`rotate(${rpmNeedleDeg} 140 140)`}>
                <line x1="140" y1="140" x2="140" y2="30" stroke="#00e5ff" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="140" y1="140" x2="140" y2="30" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="140" cy="140" r="11" fill="#ffffff" stroke="#00e5ff" strokeWidth="2.5" />
              </g>
            </svg>
          </div>

          {/* GAUGE 3: VELOCÍMETRO (Grande Centro-Direito) */}
          <div className="carbon-gauge-lg carbon-gauge-speed">
            <svg viewBox="0 0 280 280" className="carbon-svg">
              <circle cx="140" cy="140" r="135" fill="url(#carbon-pat-1)" stroke="#52525b" strokeWidth="4" />
              {/* Arco Luminoso Ciano */}
              <path d="M 45 205 A 115 115 0 1 1 235 205" fill="none" stroke="#00e5ff" strokeWidth="5" strokeOpacity="0.85" />

              {/* Ticks e Números 20 a 220 */}
              {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220].map((v) => {
                const f = (v - 20) / 200;
                const angleDeg = -125 + f * 250;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const x1 = 140 + Math.cos(angleRad) * 110;
                const y1 = 140 + Math.sin(angleRad) * 110;
                const x2 = 140 + Math.cos(angleRad) * 122;
                const y2 = 140 + Math.sin(angleRad) * 122;
                const tx = 140 + Math.cos(angleRad) * 92;
                const ty = 140 + Math.sin(angleRad) * 92 + 5;
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="3" />
                    <text x={tx} y={ty} fill="#ffffff" fontSize="14" fontWeight="800" textAnchor="middle" fontFamily="Inter">
                      {v}
                    </text>
                  </g>
                );
              })}

              <text x="140" y="115" fill="#94a3b8" fontSize="13" fontWeight="600" textAnchor="middle">km/h</text>
              <text x="175" y="165" fill="#f97316" fontSize="12" fontWeight="800">4WD</text>

              {/* Ponteiro Azul com Tampa Branca */}
              <g transform={`rotate(${speedNeedleDeg} 140 140)`}>
                <line x1="140" y1="140" x2="140" y2="30" stroke="#00e5ff" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="140" y1="140" x2="140" y2="30" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="140" cy="140" r="11" fill="#ffffff" stroke="#00e5ff" strokeWidth="2.5" />
              </g>
            </svg>
          </div>

          {/* GAUGE 4: COMBUSTÍVEL (Pequeno Direito) */}
          <div className="carbon-gauge-sm carbon-gauge-fuel">
            <svg viewBox="0 0 140 140" className="carbon-svg">
              <circle cx="70" cy="70" r="66" fill="url(#carbon-pat-1)" stroke="#3f3f46" strokeWidth="3" />
              <path d="M 28 85 A 50 50 0 0 1 112 85" fill="none" stroke="#00e5ff" strokeWidth="3" strokeOpacity="0.8" />
              <line x1="28" y1="85" x2="35" y2="80" stroke="#fff" strokeWidth="2.5" />
              <line x1="112" y1="85" x2="105" y2="80" stroke="#ef4444" strokeWidth="2.5" />
              <text x="24" y="96" fill="#cbd5e1" fontSize="12" fontWeight="700">F</text>
              <text x="114" y="96" fill="#f87171" fontSize="12" fontWeight="700" textAnchor="end">E</text>
              <g transform="translate(58, 48)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.2">
                  <path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17M3 22h12M15 9h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L20.5 6.5" />
                </svg>
              </g>
              {/* Ponteiro Azul */}
              <g transform={`rotate(${fuelNeedleDeg} 70 70)`}>
                <line x1="70" y1="70" x2="70" y2="22" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" />
                <circle cx="70" cy="70" r="5" fill="#ffffff" />
              </g>
            </svg>
          </div>
        </div>

        {/* RÉGUA INFERIOR COM HODÔMETRO, SERVICE INSPECTION E LUZES (Estilo Foto 3) */}
        <div className="carbon-bottom-status-strip">
          {/* Farol de Neblina */}
          <div className="carbon-bot-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M4 12h16M4 8h16M4 16h16" />
            </svg>
          </div>

          {/* Floco de Neve / Gelo */}
          <div className="carbon-bot-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
              <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
            </svg>
          </div>

          {/* Hodômetro Digital */}
          <div className="carbon-odometer-box">
            <span>{odo}</span> <small>km</small>
          </div>

          {/* Limite de Velocidade Placa */}
          <div className="carbon-speed-pill">
            <strong>{speedLimit}</strong> <span>km/h</span>
          </div>

          {/* Service Inspection LEDs (Verdes, Amarelo, Vermelho) */}
          <div className="carbon-inspection-bar">
            <small>SERVICE INSPECTION</small>
            <div className="inspection-dots">
              <span className="dot-green" />
              <span className="dot-green" />
              <span className="dot-green" />
              <span className="dot-green" />
              <span className="dot-green" />
              <span className="dot-yellow" />
              <span className="dot-red" />
            </div>
          </div>

          {/* Limpador */}
          <div className="carbon-bot-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <path d="M12 22a8 8 0 0 0 8-8c0-3.5-3-7-8-12-5 5-8 8.5-8 12a8 8 0 0 0 8 8z" />
            </svg>
          </div>

          {/* Farol Alto */}
          <div className={`carbon-bot-icon ${lights.beamHigh ? 'icon-highbeam-active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
              <circle cx="12" cy="12" r="6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

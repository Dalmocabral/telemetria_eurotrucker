import React from 'react';
import GpsView from '../GpsView';
import { 
  Fuel, Thermometer, Wind, Zap, 
  MapPin, Clock, Gauge, Compass, AlertCircle
} from 'lucide-react';

/**
 * Modelo 2: Route Navigator Pro (Cockpit Digital Integrado)
 * Painel de instrumentos profissional de caminhão pesado com:
 * - Mostrador Esquerdo: Velocímetro analógico/digital realista (0-140 km/h) com indicador de combustível e placa de limite de velocidade
 * - Centro: GPS com Mapa Vetorial 3D Oficial do ETS2 em tempo real, rotas rodoviárias e manobras passo a passo
 * - Mostrador Direito: Tacômetro analógico/digital (0-2500 RPM diesel) com zona econômica ECO, redline e temperatura da água
 * - Barra Superior: Luzes-espia regulamentares (setas, faróis, freio de mão, pisca-alerta, retarder, bloqueio diferencial)
 * - Barra Inferior: Computador de bordo com hodômetro, pressão do freio a ar, bateria, autonomia e relógio
 */
export default function SkinRouteNavigator({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};
  const game = data?.game || {};
  const job = data?.job || {};

  // Velocidade e Limite
  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  // Escala realista de caminhão pesado europeu (0 a 140 km/h)
  // Mapeado em 270 graus (-135° a +135°)
  const speedClamped = Math.min(140, Math.max(0, speed));
  const speedNeedleDeg = -135 + (speedClamped / 140) * 270;

  // Tacômetro de motor diesel pesado (0 a 2500 RPM / 0 a 25 x100 RPM)
  // Mapeado em 270 graus (-135° a +135°)
  const rpm = truck.rpm || 0;
  const rpmClamped = Math.min(2500, Math.max(0, rpm));
  const rpmNeedleDeg = -135 + (rpmClamped / 2500) * 270;
  const rpmMajorVal = (rpm / 100).toFixed(0);

  // Combustível
  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelPercent = Math.min(100, Math.max(0, (fuel / Math.max(1, fuelCapacity)) * 100));
  const isLowFuel = fuelPercent < 15;

  // Temperatura do Líquido de Arrefecimento (40°C a 120°C, normal ~85-90°C)
  const waterTemp = Math.round(truck.waterTemperature || 85);
  const tempPercent = Math.min(100, Math.max(0, ((waterTemp - 40) / 80) * 100));
  const isHotWater = waterTemp > 100;

  // Marcha Atual Formatada
  const gearText = truck.displayedGear || (truck.gear > 0 ? `D${truck.gear}` : truck.gear < 0 ? `R${Math.abs(truck.gear)}` : 'N');

  // Ar dos Freios
  const airPressure = truck.brakeAirPressure !== undefined ? truck.brakeAirPressure : 8.5;
  const isLowAir = airPressure < 6.0;

  // Autonomia estimada em KM
  const avgConsumption = truck.fuelAverageConsumption || 33.5;
  const estimatedRange = Math.round((fuel / Math.max(1, avgConsumption)) * 100);

  // Ticks do Velocímetro (0 a 140)
  const speedTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140];

  // Ticks do Tacômetro (0 a 25 x100 RPM)
  const rpmTicks = [0, 5, 10, 15, 20, 25];
  const rpmSubTicks = [
    1, 2, 3, 4, 
    6, 7, 8, 9, 
    11, 12, 13, 14, 
    16, 17, 18, 19, 
    21, 22, 23, 24
  ];

  return (
    <div className="skin-route-container">
      <div className="skin-route-housing">
        {/* ====================================================================
            1. BARRA SUPERIOR DE LUZES-ESPIA (TELLTALE LAMPS)
            ==================================================================== */}
        <div className="route-telltale-bar">
          {/* Seta Esquerda */}
          <div className={`route-telltale-icon ${lights.blinkerLeft ? 'telltale-active-green blink' : ''}`} title="Seta Esquerda">
            <svg width="22" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 6l-6 6 6 6V6z" />
            </svg>
          </div>

          {/* Farol Baixo */}
          <div className={`route-telltale-icon ${lights.beamLow ? 'telltale-active-green' : ''}`} title="Farol Baixo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="4" />
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
              <line x1="1" y1="12" x2="4" y2="12" />
            </svg>
          </div>

          {/* Farol Alto */}
          <div className={`route-telltale-icon ${lights.beamHigh ? 'telltale-active-blue' : ''}`} title="Farol Alto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Freio Motor / Retarder */}
          <div className={`route-telltale-icon ${(truck.motorBrake || truck.retarderLevel > 0) ? 'telltale-active-amber' : ''}`} title="Retarder / Freio Motor">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          </div>

          {/* Bloqueio do Diferencial */}
          <div className={`route-telltale-icon ${truck.differentialLock ? 'telltale-active-amber' : ''}`} title="Bloqueio de Diferencial">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="5" y="5" width="14" height="14" rx="2" />
              <line x1="5" y1="12" x2="19" y2="12" />
              <line x1="12" y1="5" x2="12" y2="19" />
            </svg>
          </div>

          {/* Freio de Estacionamento (P) */}
          <div className={`route-telltale-icon ${truck.parkBrake ? 'telltale-active-red' : ''}`} title="Freio de Estacionamento">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 8h4a2.5 2.5 0 0 1 0 5H9V8z" fill="currentColor" />
            </svg>
          </div>

          {/* Pisca-Alerta */}
          <div className={`route-telltale-icon ${(lights.hazard || (lights.blinkerLeft && lights.blinkerRight)) ? 'telltale-active-amber blink' : ''}`} title="Pisca Alerta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="12 2 22 20 2 20" />
            </svg>
          </div>

          {/* Seta Direita */}
          <div className={`route-telltale-icon ${lights.blinkerRight ? 'telltale-active-green blink' : ''}`} title="Seta Direita">
            <svg width="22" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 18l6-6-6-6v12z" />
            </svg>
          </div>
        </div>

        {/* ====================================================================
            2. CORPO PRINCIPAL COM OS 2 MOSTRADORES E O MAPA NO MEIO
            ==================================================================== */}
        <div className="route-main-gauges-row">
          
          {/* ------------------------------------------------------------------
              A) MOSTRADOR ESQUERDO: VELOCÍMETRO (0 - 140 KM/H)
              ------------------------------------------------------------------ */}
          <div className="route-dial-wrapper route-dial-left">
            <svg viewBox="0 0 340 340" className="route-dial-svg">
              <defs>
                {/* Gradiente Metálico do Aro Externo */}
                <radialGradient id="route-bezel-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="85%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#334155" />
                </radialGradient>

                {/* Gradiente da Face do Mostrador */}
                <radialGradient id="route-dial-face-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="80%" stopColor="#070c16" />
                  <stop offset="100%" stopColor="#030712" />
                </radialGradient>

                {/* Ponteiro Vermelho Fluorescente 3D */}
                <linearGradient id="route-needle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff5252" />
                  <stop offset="70%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>

                {/* Filtro de Brilho do Ponteiro */}
                <filter id="route-needle-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Anel Externo Bisotado em Alumínio Escovado */}
              <circle cx="170" cy="170" r="165" fill="#111827" stroke="url(#route-bezel-grad)" strokeWidth="6" />
              <circle cx="170" cy="170" r="158" fill="url(#route-dial-face-grad)" stroke="#1e293b" strokeWidth="2" />
              <circle cx="170" cy="170" r="154" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

              {/* Arco de Velocidade de Cruzeiro Verde (80 a 90 km/h) */}
              <path
                d="M 170 170 L 165 24 A 146 146 0 0 1 198 27 Z"
                fill="#10b981"
                opacity="0.25"
              />

              {/* Arco Externo Fino de Referência */}
              <path 
                d="M 67 273 A 146 146 0 1 1 273 273" 
                fill="none" 
                stroke="#1e293b" 
                strokeWidth="2" 
                strokeLinecap="round" 
              />

              {/* Ticks e Números da Escala (0 a 140 km/h) */}
              {speedTicks.map((v) => {
                const angleDeg = -135 + (v / 140) * 270;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const isMajor = v % 20 === 0;

                const r1 = isMajor ? 134 : 140;
                const r2 = 148;
                const x1 = 170 + Math.cos(angleRad) * r1;
                const y1 = 170 + Math.sin(angleRad) * r1;
                const x2 = 170 + Math.cos(angleRad) * r2;
                const y2 = 170 + Math.sin(angleRad) * r2;

                // Coordenadas dos Números
                const tx = 170 + Math.cos(angleRad) * 116;
                const ty = 170 + Math.sin(angleRad) * 116 + 5;

                return (
                  <g key={v}>
                    <line 
                      x1={x1} y1={y1} x2={x2} y2={y2} 
                      stroke={isMajor ? '#f8fafc' : '#94a3b8'} 
                      strokeWidth={isMajor ? 2.8 : 1.4} 
                      strokeLinecap="round"
                    />
                    {isMajor && (
                      <text 
                        x={tx} y={ty} 
                        fill={v === 80 ? '#38bdf8' : '#f1f5f9'} 
                        fontSize="14" 
                        fontWeight="700" 
                        textAnchor="middle" 
                        fontFamily="'Inter', 'Montserrat', sans-serif"
                      >
                        {v}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Sub-ticks intermediários (a cada 5 km/h) */}
              {[5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135].map((v) => {
                const angleDeg = -135 + (v / 140) * 270;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const x1 = 170 + Math.cos(angleRad) * 144;
                const y1 = 170 + Math.sin(angleRad) * 144;
                const x2 = 170 + Math.cos(angleRad) * 148;
                const y2 = 170 + Math.sin(angleRad) * 148;
                return (
                  <line 
                    key={v}
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke="#475569" 
                    strokeWidth="1.2" 
                  />
                );
              })}

              {/* Arco Inferior de Combustível */}
              <path 
                d="M 105 272 A 100 100 0 0 1 235 272" 
                fill="none" 
                stroke="#1e293b" 
                strokeWidth="5" 
                strokeLinecap="round" 
              />
              <path 
                d="M 105 272 A 100 100 0 0 1 235 272" 
                fill="none" 
                stroke={isLowFuel ? "#ef4444" : "#00e5ff"} 
                strokeWidth="5" 
                strokeDasharray={`${(fuelPercent / 100) * 155} 250`}
                strokeLinecap="round" 
                style={{ filter: isLowFuel ? 'drop-shadow(0 0 4px #ef4444)' : 'drop-shadow(0 0 4px #00e5ff)' }}
              />

              {/* Ponteiro Analógico Realista de Velocidade */}
              <g transform={`rotate(${speedNeedleDeg} 170 170)`} filter="url(#route-needle-glow)">
                {/* Corpo luminoso do ponteiro */}
                <line x1="170" y1="170" x2="170" y2="34" stroke="url(#route-needle-grad)" strokeWidth="4.2" strokeLinecap="round" />
                {/* Filete luminoso central branco */}
                <line x1="170" y1="150" x2="170" y2="38" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
              </g>

              {/* Calota Central do Ponteiro (Hub Metálico) */}
              <circle cx="170" cy="170" r="24" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
              <circle cx="170" cy="170" r="16" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
              <circle cx="170" cy="170" r="6" fill="#64748b" />
            </svg>

            {/* Display Digital Central de Velocidade */}
            <div className="route-dial-center-content">
              <div 
                className="route-digital-speed" 
                style={{ color: isOverSpeed ? '#ff4d4f' : '#ffffff' }}
              >
                {speed}
              </div>
              <div className="route-digital-unit">km/h</div>
            </div>

            {/* Placa Realista de Limite de Velocidade no Mostrador */}
            <div className={`route-speed-limit-badge ${isOverSpeed ? 'limit-overspeed-pulse' : ''}`} title={`Limite da via: ${speedLimit} km/h`}>
              <span>{speedLimit}</span>
            </div>

            {/* Ícone e Leitura de Combustível no Arco Inferior */}
            <div className="route-sub-gauge-info route-fuel-info">
              <Fuel size={14} color={isLowFuel ? '#ef4444' : '#00e5ff'} />
              <span className={isLowFuel ? 'low-alert-text' : ''}>
                {Math.round(fuel)} L <small>({Math.round(fuelPercent)}%)</small>
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              B) CENTRO: O MAPA DE NAVEGAÇÃO GPS REALISTA (ENTRE OS 2 MOSTRADORES)
              ------------------------------------------------------------------ */}
          <div className="route-center-nav-display">
            <div className="route-cockpit-screen">
              
              {/* Moldura Superior da Tela de Cockpit */}
              <div className="route-screen-header">
                {/* Marcha Atual */}
                <div className="route-gear-badge" title="Marcha Engatada">
                  <span className="gear-sub">MARCHA</span>
                  <span className="gear-main">{gearText}</span>
                </div>

                {/* Piloto Automático (Cruise Control) */}
                <div className={`route-cruise-badge ${truck.cruiseControl ? 'active-cruise' : ''}`} title="Piloto Automático">
                  <span className="cruise-led" />
                  <span className="cruise-title">CRUISE</span>
                  <strong className="cruise-val">{truck.cruiseControl ? `${truck.cruiseControlSpeed} km/h` : 'OFF'}</strong>
                </div>

                {/* Retarder Ativo (se houver) */}
                {truck.retarderLevel > 0 && (
                  <div className="route-retarder-badge">
                    <span>RETARDER R{truck.retarderLevel}</span>
                  </div>
                )}
              </div>

              {/* Viewport do GPS MapLibre GL com Rotas Rodoviárias e Manobras */}
              <div className="route-embedded-map-wrapper">
                <GpsView data={data} isEmbedded={true} />
              </div>

              {/* Brilho de Reflexo Superior do Vidro do Cockpit */}
              <div className="route-screen-glass-glare" />
            </div>
          </div>

          {/* ------------------------------------------------------------------
              C) MOSTRADOR DIREITO: TACÔMETRO / RPM (0 - 25 x100 RPM DIESEL)
              ------------------------------------------------------------------ */}
          <div className="route-dial-wrapper route-dial-right">
            <svg viewBox="0 0 340 340" className="route-dial-svg">
              {/* Aro Externo Bisotado em Alumínio Escovado */}
              <circle cx="170" cy="170" r="165" fill="#111827" stroke="url(#route-bezel-grad)" strokeWidth="6" />
              <circle cx="170" cy="170" r="158" fill="url(#route-dial-face-grad)" stroke="#1e293b" strokeWidth="2" />
              <circle cx="170" cy="170" r="154" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

              {/* Faixa Econômica Verde (ECO BAND: 1000 a 1500 RPM / Ticks 10 a 15) */}
              <path
                d="M 170 170 L 118 36 A 146 146 0 0 1 170 24 Z"
                fill="#10b981"
                opacity="0.32"
              />

              {/* Faixa Amarela de Atenção (1800 a 2100 RPM / Ticks 18 a 21) */}
              <path
                d="M 170 170 L 208 30 A 146 146 0 0 1 248 48 Z"
                fill="#f59e0b"
                opacity="0.32"
              />

              {/* Faixa Vermelha de Redline (> 2100 RPM / Ticks 21 a 25) */}
              <path
                d="M 170 170 L 248 48 A 146 146 0 0 1 273 67 Z"
                fill="#ef4444"
                opacity="0.38"
              />

              {/* Arco Externo Fino de Referência */}
              <path 
                d="M 67 273 A 146 146 0 1 1 273 273" 
                fill="none" 
                stroke="#1e293b" 
                strokeWidth="2" 
                strokeLinecap="round" 
              />

              {/* Rótulo ECO na Faixa Verde */}
              <text 
                x="142" y="58" 
                fill="#10b981" 
                fontSize="11" 
                fontWeight="800" 
                letterSpacing="1"
                textAnchor="middle" 
                fontFamily="'Inter', sans-serif"
              >
                ECO
              </text>

              {/* Ticks Maiores com Números (0, 5, 10, 15, 20, 25) */}
              {rpmTicks.map((v) => {
                const angleDeg = -135 + (v / 25) * 270;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const isRed = v >= 21;
                const isEco = v >= 10 && v <= 15;

                const r1 = 132;
                const r2 = 148;
                const x1 = 170 + Math.cos(angleRad) * r1;
                const y1 = 170 + Math.sin(angleRad) * r1;
                const x2 = 170 + Math.cos(angleRad) * r2;
                const y2 = 170 + Math.sin(angleRad) * r2;

                const tx = 170 + Math.cos(angleRad) * 115;
                const ty = 170 + Math.sin(angleRad) * 115 + 5;

                return (
                  <g key={v}>
                    <line 
                      x1={x1} y1={y1} x2={x2} y2={y2} 
                      stroke={isRed ? '#ef4444' : isEco ? '#10b981' : '#f8fafc'} 
                      strokeWidth={3} 
                      strokeLinecap="round"
                    />
                    <text 
                      x={tx} y={ty} 
                      fill={isRed ? '#f87171' : isEco ? '#34d399' : '#f1f5f9'} 
                      fontSize="15" 
                      fontWeight="700" 
                      textAnchor="middle" 
                      fontFamily="'Inter', 'Montserrat', sans-serif"
                    >
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* Ticks Menores de RPM (cada 100 RPM) */}
              {rpmSubTicks.map((v) => {
                const angleDeg = -135 + (v / 25) * 270;
                const angleRad = (angleDeg - 90) * (Math.PI / 180);
                const isRed = v >= 21;
                const isEco = v >= 10 && v <= 15;

                const x1 = 170 + Math.cos(angleRad) * 140;
                const y1 = 170 + Math.sin(angleRad) * 140;
                const x2 = 170 + Math.cos(angleRad) * 148;
                const y2 = 170 + Math.sin(angleRad) * 148;

                return (
                  <line 
                    key={v}
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={isRed ? '#ef4444' : isEco ? '#10b981' : '#64748b'} 
                    strokeWidth="1.6" 
                  />
                );
              })}

              {/* Arco Inferior de Temperatura da Água */}
              <path 
                d="M 105 272 A 100 100 0 0 1 235 272" 
                fill="none" 
                stroke="#1e293b" 
                strokeWidth="5" 
                strokeLinecap="round" 
              />
              <path 
                d="M 105 272 A 100 100 0 0 1 235 272" 
                fill="none" 
                stroke={isHotWater ? "#ef4444" : "#00e5ff"} 
                strokeWidth="5" 
                strokeDasharray={`${(tempPercent / 100) * 155} 250`}
                strokeLinecap="round" 
                style={{ filter: isHotWater ? 'drop-shadow(0 0 4px #ef4444)' : 'drop-shadow(0 0 4px #00e5ff)' }}
              />

              {/* Ponteiro Analógico Realista de RPM */}
              <g transform={`rotate(${rpmNeedleDeg} 170 170)`} filter="url(#route-needle-glow)">
                <line x1="170" y1="170" x2="170" y2="34" stroke="url(#route-needle-grad)" strokeWidth="4.2" strokeLinecap="round" />
                <line x1="170" y1="150" x2="170" y2="38" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
              </g>

              {/* Calota Central do Ponteiro */}
              <circle cx="170" cy="170" r="24" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
              <circle cx="170" cy="170" r="16" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
              <circle cx="170" cy="170" r="6" fill="#64748b" />
            </svg>

            {/* Display Digital Central de RPM */}
            <div className="route-dial-center-content">
              <div className="route-digital-speed route-rpm-val">
                {Math.round(rpm)}
              </div>
              <div className="route-digital-unit">RPM</div>
            </div>

            {/* Informação de Óleo do Motor */}
            <div className="route-rpm-scale-label">
              <span>x100 r/min</span>
            </div>

            {/* Ícone e Leitura de Temperatura da Água no Arco Inferior */}
            <div className="route-sub-gauge-info route-temp-info">
              <Thermometer size={14} color={isHotWater ? '#ef4444' : '#00e5ff'} />
              <span className={isHotWater ? 'hot-alert-text' : ''}>
                {waterTemp} °C
              </span>
            </div>
          </div>

        </div>

        {/* ====================================================================
            3. BARRA INFERIOR DE COMPUTADOR DE BORDO E TELEMETRIA (TRIP COMPUTER)
            ==================================================================== */}
        <div className="route-bottom-trip-bar">
          {/* Hodômetro */}
          <div className="route-trip-item" title="Hodômetro Total">
            <Gauge size={15} color="#94a3b8" />
            <span className="trip-label">ODO:</span>
            <strong className="trip-value">{Math.round(truck.odometer || 124500).toLocaleString('pt-BR')} km</strong>
          </div>

          {/* Pressão do Ar dos Freios */}
          <div className={`route-trip-item ${isLowAir ? 'trip-alert-item' : ''}`} title="Pressão dos Cilindros de Freio a Ar">
            <Wind size={15} color={isLowAir ? '#ef4444' : '#38bdf8'} />
            <span className="trip-label">AR:</span>
            <strong className="trip-value">{airPressure.toFixed(1)} bar</strong>
          </div>

          {/* Tensão da Bateria (24V Sistema de Caminhões) */}
          <div className="route-trip-item" title="Tensão Elétrica da Bateria">
            <Zap size={15} color="#facc15" />
            <span className="trip-label">BAT:</span>
            <strong className="trip-value">{(truck.batteryVoltage || 24.4).toFixed(1)} V</strong>
          </div>

          {/* Autonomia Estimada */}
          <div className="route-trip-item" title="Autonomia Estimada de Combustível">
            <Fuel size={15} color="#00e5ff" />
            <span className="trip-label">AUTON:</span>
            <strong className="trip-value">~{estimatedRange} km</strong>
          </div>

          {/* Relógio do Jogo */}
          <div className="route-trip-item" title="Horário no Mundo do ETS2">
            <Clock size={15} color="#a78bfa" />
            <span className="trip-label">HORA:</span>
            <strong className="trip-value">{game.time ? `${game.time}` : '14:35'} · 22°C</strong>
          </div>
        </div>

      </div>
    </div>
  );
}

import React from 'react';
import { 
  Fuel, Thermometer, Gauge, Wind, Zap, 
  Clock, ShieldAlert, AlertTriangle
} from 'lucide-react';

/**
 * Modelo 1: Aero Dual Pro (Baseado com fidelidade na Foto 1)
 * Cluster duplo esportivo com acabamento 3D profundo, aros bisotados em titânio,
 * arcos luminosos neon dinâmicos em ciano e verde, agulhas aerodinâmicas iluminadas,
 * sub-medidores inferiores de combustível e temperatura, setas direcionais duplas
 * e relógio trapezoidal chanfrado.
 */
export default function SkinAeroDual({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};
  const game = data?.game || {};

  // Velocidade e Limite
  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  // Escala de Velocidade (0 a 300 km/h mapeado fielmente à Foto 1)
  // Varredura de 250 graus (-125° a +125°)
  const speedFraction = Math.min(1, Math.max(0, speed / 300));
  const speedNeedleDeg = -125 + speedFraction * 250;

  // Escala de RPM (0 a 9 x1000 RPM)
  // Mapeamento dinâmico para motor de caminhão: 1.400 RPM fica em 5.0 (centro exato da zona verde de eficiência da Foto 1)
  const rpm = truck.rpm || 0;
  const rpmScaled = Math.min(9, Math.max(0, (rpm * 3.6) / 1000));
  const rpmFraction = rpmScaled / 9;
  const rpmNeedleDeg = -125 + rpmFraction * 250;
  const rpmDisplayVal = rpmScaled.toFixed(0);

  // Combustível
  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelPercent = Math.min(100, Math.max(0, (fuel / Math.max(1, fuelCapacity)) * 100));
  const isLowFuel = fuelPercent < 15;

  // Temperatura da Água (40°C a 120°C, normal ~85-90°C)
  const waterTemp = Math.round(truck.waterTemperature || 85);
  const tempPercent = Math.min(100, Math.max(0, ((waterTemp - 40) / 80) * 100));
  const isHotWater = waterTemp > 100;

  // Marcha Engatada
  const gearText = truck.displayedGear || (truck.gear > 0 ? `D${truck.gear}` : truck.gear < 0 ? `R${Math.abs(truck.gear)}` : 'N');

  // Ar dos Freios
  const airPressure = truck.brakeAirPressure !== undefined ? truck.brakeAirPressure : 8.5;
  const isLowAir = airPressure < 6.0;

  // Autonomia estimada
  const avgConsumption = truck.fuelAverageConsumption || 33.5;
  const estimatedRange = Math.round((fuel / Math.max(1, avgConsumption)) * 100);

  // Comprimento do arco principal (raio 140, 250 graus = 610.86px)
  const arcLength = 610.86;
  const speedDashOffset = arcLength * (1 - speedFraction);
  const rpmDashOffset = arcLength * (1 - rpmFraction);

  // Comprimento do arco inferior (raio 105, 90 graus = 164.9px)
  const subArcLength = 164.9;
  const fuelDashOffset = subArcLength * (1 - (fuelPercent / 100));
  const tempDashOffset = subArcLength * (1 - (tempPercent / 100));

  // Ticks de velocidade da Foto 1
  const speedTicks = [0, 40, 80, 100, 140, 180, 220, 260, 300];

  // Ticks de RPM da Foto 1
  const rpmTicks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="skin-aero-container">
      <div className="skin-aero-cluster-housing">
        
        {/* ====================================================================
            1. SETAS DIRECIONAIS DUPLAS E TELLTALES (CENTRO SUPERIOR DA FOTO 1)
            ==================================================================== */}
        <div className="aero-top-signals-bridge">
          {/* Seta Esquerda */}
          <div className={`aero-signal-chevron ${lights.blinkerLeft ? 'signal-active-left blink' : ''}`} title="Seta Esquerda">
            <svg width="42" height="28" viewBox="0 0 42 28">
              <polygon 
                points="22,4 6,14 22,24 22,18 38,18 38,10 22,10"
                fill={lights.blinkerLeft ? "#10b981" : "rgba(30, 58, 138, 0.25)"}
                stroke={lights.blinkerLeft ? "#34d399" : "#2563eb"}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Micro-painel de status central */}
          <div className="aero-bridge-status-icons">
            {/* Farol Baixo */}
            <span className={`aero-micro-icon ${lights.beamLow ? 'icon-green' : ''}`} title="Farol Baixo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="4" />
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                <line x1="1" y1="12" x2="4" y2="12" />
              </svg>
            </span>

            {/* Farol Alto */}
            <span className={`aero-micro-icon ${lights.beamHigh ? 'icon-blue' : ''}`} title="Farol Alto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </span>

            {/* Freio de Mão */}
            <span className={`aero-micro-icon ${truck.parkBrake ? 'icon-red' : ''}`} title="Freio de Estacionamento">
              <strong style={{ fontSize: '10px' }}>(P)</strong>
            </span>
          </div>

          {/* Seta Direita */}
          <div className={`aero-signal-chevron ${lights.blinkerRight ? 'signal-active-right blink' : ''}`} title="Seta Direita">
            <svg width="42" height="28" viewBox="0 0 42 28">
              <polygon 
                points="20,4 36,14 20,24 20,18 4,18 4,10 20,10"
                fill={lights.blinkerRight ? "#10b981" : "rgba(30, 58, 138, 0.25)"}
                stroke={lights.blinkerRight ? "#34d399" : "#2563eb"}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* ====================================================================
            2. LINHA DOS DOIS MOSTRADORES (VELOCÍMETRO E TACÔMETRO)
            ==================================================================== */}
        <div className="aero-dials-row">
          
          {/* MOSTRADOR ESQUERDO: VELOCÍMETRO (0 - 300 KM/H) */}
          <div className="aero-dial-pod aero-dial-left">
          <svg viewBox="0 0 340 340" className="aero-dial-svg">
            <defs>
              {/* Brilho Neon Ciano */}
              <filter id="aero-cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Brilho da Agulha */}
              <filter id="aero-needle-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Gradiente da Agulha Ciano */}
              <linearGradient id="aero-needle-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="70%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>

              {/* Gradiente de Profundidade do Mostrador */}
              <radialGradient id="aero-pod-radial" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0f192d" />
                <stop offset="75%" stopColor="#080e1c" />
                <stop offset="100%" stopColor="#03060c" />
              </radialGradient>
            </defs>

            {/* Aros Externos Decorativos com Efeito Bisotado */}
            <circle cx="170" cy="170" r="165" fill="#040711" stroke="#1e293b" strokeWidth="6" />
            <circle cx="170" cy="170" r="158" fill="url(#aero-pod-radial)" stroke="#2563eb" strokeWidth="2.2" strokeOpacity="0.45" />
            <circle cx="170" cy="170" r="154" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

            {/* Trilho de Fundo do Arco de Velocidade (Azul Profundo) */}
            <path 
              d="M 55.3 250.3 A 140 140 0 1 1 284.7 250.3" 
              fill="none" 
              stroke="#132342" 
              strokeWidth="4" 
              strokeLinecap="round" 
            />

            {/* Arco Verde de Cruzeiro da Foto 1 (0 a 100 km/h) */}
            <path 
              d="M 55.3 250.3 A 140 140 0 0 1 76.9 65.5" 
              fill="none" 
              stroke="#22c55e" 
              strokeWidth="5" 
              strokeLinecap="round" 
              style={{ filter: 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.6))' }}
            />

            {/* Arco Ativo Dinâmico de Velocidade (Ciano Neon Fluorescente) */}
            <path 
              d="M 55.3 250.3 A 140 140 0 1 1 284.7 250.3" 
              fill="none" 
              stroke={isOverSpeed ? "#ef4444" : "#00e5ff"} 
              strokeWidth="5" 
              strokeLinecap="round" 
              strokeDasharray={arcLength}
              strokeDashoffset={speedDashOffset}
              filter="url(#aero-cyan-glow)"
            />

            {/* Tracinhos Graduados e Rótulos Numéricos da Foto 1 */}
            {speedTicks.map((v) => {
              const f = v / 300;
              const angleDeg = -125 + f * 250;
              const angleRad = (angleDeg - 90) * (Math.PI / 180);

              const isRed = v >= 220;
              const isAccent = v === 100;

              const r1 = isAccent ? 132 : 138;
              const r2 = 148;
              const x1 = 170 + Math.cos(angleRad) * r1;
              const y1 = 170 + Math.sin(angleRad) * r1;
              const x2 = 170 + Math.cos(angleRad) * r2;
              const y2 = 170 + Math.sin(angleRad) * r2;

              // Posição do Texto Numérico
              const tx = 170 + Math.cos(angleRad) * 114;
              const ty = 170 + Math.sin(angleRad) * 114 + 5;

              return (
                <g key={v}>
                  <line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={isRed ? "#ef4444" : isAccent ? "#00e5ff" : "#38bdf8"} 
                    strokeWidth={isAccent ? 3.5 : 2.2} 
                    strokeLinecap="round"
                  />
                  <text 
                    x={tx} y={ty} 
                    fill={isRed ? "#f87171" : isAccent ? "#ffffff" : "#94a3b8"} 
                    fontSize={isAccent ? "15" : "13.5"} 
                    fontWeight="700" 
                    textAnchor="middle" 
                    fontFamily="'Inter', sans-serif"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Sub-tracinhos intermediários */}
            {[20, 60, 120, 160, 200, 240, 280].map((v) => {
              const f = v / 300;
              const angleDeg = -125 + f * 250;
              const angleRad = (angleDeg - 90) * (Math.PI / 180);
              const x1 = 170 + Math.cos(angleRad) * 142;
              const y1 = 170 + Math.sin(angleRad) * 142;
              const x2 = 170 + Math.cos(angleRad) * 148;
              const y2 = 170 + Math.sin(angleRad) * 148;
              return (
                <line 
                  key={v}
                  x1={x1} y1={y1} x2={x2} y2={y2} 
                  stroke="#1e3a8a" 
                  strokeWidth="1.4" 
                />
              );
            })}

            {/* ==================== MEDIDOR INFERIOR DE COMBUSTÍVEL ==================== */}
            {/* Trilho de Fundo */}
            <path 
              d="M 95.8 244.2 A 105 105 0 0 0 244.2 244.2" 
              fill="none" 
              stroke="#132342" 
              strokeWidth="4" 
              strokeLinecap="round" 
            />
            {/* Faixa Vermelha de Reserva (Primeiros 20%) */}
            <path 
              d="M 95.8 244.2 A 105 105 0 0 0 125 264" 
              fill="none" 
              stroke="#e11d48" 
              strokeWidth="4" 
              strokeLinecap="round" 
              opacity="0.8"
            />
            {/* Arco Ativo Dinâmico de Combustível */}
            <path 
              d="M 95.8 244.2 A 105 105 0 0 0 244.2 244.2" 
              fill="none" 
              stroke={isLowFuel ? "#ef4444" : "#00e5ff"} 
              strokeWidth="4" 
              strokeDasharray={subArcLength}
              strokeDashoffset={fuelDashOffset}
              strokeLinecap="round" 
              style={{ filter: isLowFuel ? 'drop-shadow(0 0 5px #ef4444)' : 'drop-shadow(0 0 5px #00e5ff)' }}
            />

            {/* Agulha Esportiva Aerodinâmica Iluminada */}
            <g transform={`rotate(${speedNeedleDeg} 170 170)`} filter="url(#aero-needle-glow)">
              <line x1="170" y1="170" x2="170" y2="34" stroke="url(#aero-needle-cyan)" strokeWidth="3.8" strokeLinecap="round" />
              <line x1="170" y1="140" x2="170" y2="38" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
            </g>

            {/* Calota Central de Alumínio Escovado */}
            <circle cx="170" cy="170" r="22" fill="#0b1329" stroke="#2563eb" strokeWidth="2.5" />
            <circle cx="170" cy="170" r="14" fill="#080e1c" stroke="#1d4ed8" strokeWidth="1.5" />
            <circle cx="170" cy="170" r="5" fill="#38bdf8" />
          </svg>

          {/* Display Digital Central de Velocidade */}
          <div className="aero-dial-center-box">
            <div 
              className="aero-main-speed-val" 
              style={{ color: isOverSpeed ? '#ff1744' : '#ffffff' }}
            >
              {speed}
            </div>
            <div className="aero-main-unit">km/h</div>
          </div>

          {/* Placa de Limite de Velocidade Flutuante (Estilo Euro) */}
          {speedLimit > 0 && (
            <div className={`aero-speed-limit-tag ${isOverSpeed ? 'overspeed-blink' : ''}`} title={`Limite: ${speedLimit} km/h`}>
              <span>{speedLimit}</span>
            </div>
          )}

          {/* Leitura e Ícone Inferior de Combustível */}
          <div className="aero-bottom-subgauge-info">
            <Fuel size={16} color={isLowFuel ? '#ef4444' : '#00e5ff'} />
            <span className={`aero-sub-val ${isLowFuel ? 'low-fuel-text' : ''}`}>
              {Math.round(fuel)} L <small>({Math.round(fuelPercent)}%)</small>
            </span>
          </div>
        </div>

        {/* ====================================================================
            3. MOSTRADOR DIREITO: TACÔMETRO / RPM (0 - 9 x1000 RPM)
            ==================================================================== */}
        <div className="aero-dial-pod aero-dial-right">
          <svg viewBox="0 0 340 340" className="aero-dial-svg">
            {/* Aros Externos Decorativos */}
            <circle cx="170" cy="170" r="165" fill="#040711" stroke="#1e293b" strokeWidth="6" />
            <circle cx="170" cy="170" r="158" fill="url(#aero-pod-radial)" stroke="#2563eb" strokeWidth="2.2" strokeOpacity="0.45" />
            <circle cx="170" cy="170" r="154" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

            {/* Trilho de Fundo do Arco de RPM */}
            <path 
              d="M 55.3 250.3 A 140 140 0 1 1 284.7 250.3" 
              fill="none" 
              stroke="#132342" 
              strokeWidth="4" 
              strokeLinecap="round" 
            />

            {/* Arco Verde de Eficiência Econômica da Foto 1 (1 a 5) */}
            <path 
              d="M 31.1 187.5 A 140 140 0 0 1 203.6 34.1" 
              fill="none" 
              stroke="#22c55e" 
              strokeWidth="5" 
              strokeLinecap="round" 
              style={{ filter: 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.6))' }}
            />

            {/* Arco Ativo Dinâmico de RPM (Ciano Neon) */}
            <path 
              d="M 55.3 250.3 A 140 140 0 1 1 284.7 250.3" 
              fill="none" 
              stroke={rpmScaled >= 7 ? "#ef4444" : "#00e5ff"} 
              strokeWidth="5" 
              strokeLinecap="round" 
              strokeDasharray={arcLength}
              strokeDashoffset={rpmDashOffset}
              filter="url(#aero-cyan-glow)"
            />

            {/* Tracinhos Graduados (0 a 9) da Foto 1 */}
            {rpmTicks.map((v) => {
              const f = v / 9;
              const angleDeg = -125 + f * 250;
              const angleRad = (angleDeg - 90) * (Math.PI / 180);

              const isRed = v >= 7;
              const isFive = v === 5;

              const r1 = isFive ? 132 : 138;
              const r2 = 148;
              const x1 = 170 + Math.cos(angleRad) * r1;
              const y1 = 170 + Math.sin(angleRad) * r1;
              const x2 = 170 + Math.cos(angleRad) * r2;
              const y2 = 170 + Math.sin(angleRad) * r2;

              const tx = 170 + Math.cos(angleRad) * 114;
              const ty = 170 + Math.sin(angleRad) * 114 + 5;

              return (
                <g key={v}>
                  <line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={isRed ? "#ef4444" : isFive ? "#22c55e" : "#38bdf8"} 
                    strokeWidth={isFive ? 3.5 : 2.2} 
                    strokeLinecap="round"
                  />
                  <text 
                    x={tx} y={ty} 
                    fill={isRed ? "#f87171" : isFive ? "#34d399" : "#94a3b8"} 
                    fontSize={isFive ? "16" : "14"} 
                    fontWeight="700" 
                    textAnchor="middle" 
                    fontFamily="'Inter', sans-serif"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Sub-tracinhos a cada 0.5 */}
            {[0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5].map((v) => {
              const f = v / 9;
              const angleDeg = -125 + f * 250;
              const angleRad = (angleDeg - 90) * (Math.PI / 180);
              const x1 = 170 + Math.cos(angleRad) * 142;
              const y1 = 170 + Math.sin(angleRad) * 142;
              const x2 = 170 + Math.cos(angleRad) * 148;
              const y2 = 170 + Math.sin(angleRad) * 148;
              return (
                <line 
                  key={v}
                  x1={x1} y1={y1} x2={x2} y2={y2} 
                  stroke={v >= 7 ? "#ef4444" : "#1e3a8a"} 
                  strokeWidth="1.4" 
                />
              );
            })}

            {/* ==================== MEDIDOR INFERIOR DE TEMPERATURA ==================== */}
            {/* Trilho de Fundo */}
            <path 
              d="M 95.8 244.2 A 105 105 0 0 0 244.2 244.2" 
              fill="none" 
              stroke="#132342" 
              strokeWidth="4" 
              strokeLinecap="round" 
            />
            {/* Faixa Vermelha de Superaquecimento (Últimos 20%) */}
            <path 
              d="M 215 264 A 105 105 0 0 0 244.2 244.2" 
              fill="none" 
              stroke="#e11d48" 
              strokeWidth="4" 
              strokeLinecap="round" 
              opacity="0.8"
            />
            {/* Arco Ativo Dinâmico de Temperatura */}
            <path 
              d="M 95.8 244.2 A 105 105 0 0 0 244.2 244.2" 
              fill="none" 
              stroke={isHotWater ? "#ef4444" : "#38bdf8"} 
              strokeWidth="4" 
              strokeDasharray={subArcLength}
              strokeDashoffset={tempDashOffset}
              strokeLinecap="round" 
              style={{ filter: isHotWater ? 'drop-shadow(0 0 5px #ef4444)' : 'drop-shadow(0 0 5px #38bdf8)' }}
            />

            {/* Agulha Esportiva Iluminada */}
            <g transform={`rotate(${rpmNeedleDeg} 170 170)`} filter="url(#aero-needle-glow)">
              <line x1="170" y1="170" x2="170" y2="34" stroke="url(#aero-needle-cyan)" strokeWidth="3.8" strokeLinecap="round" />
              <line x1="170" y1="140" x2="170" y2="38" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
            </g>

            {/* Calota Central de Alumínio */}
            <circle cx="170" cy="170" r="22" fill="#0b1329" stroke="#2563eb" strokeWidth="2.5" />
            <circle cx="170" cy="170" r="14" fill="#080e1c" stroke="#1d4ed8" strokeWidth="1.5" />
            <circle cx="170" cy="170" r="5" fill="#38bdf8" />
          </svg>

          {/* Display Digital Central de RPM e Marcha */}
          <div className="aero-dial-center-box">
            <div className="aero-main-speed-val aero-rpm-display-val">
              {gearText !== 'N' ? gearText : rpmDisplayVal}
            </div>
            <div className="aero-main-unit">
              {gearText !== 'N' ? `RPM: ${Math.round(rpm)}` : 'x1000 RPM'}
            </div>
          </div>

          {/* Indicador de Cruise Control Ativo */}
          {truck.cruiseControl && (
            <div className="aero-cruise-tag">
              <span>CRUISE {truck.cruiseControlSpeed} km/h</span>
            </div>
          )}

          {/* Leitura e Ícone Inferior de Temperatura */}
          <div className="aero-bottom-subgauge-info">
            <Thermometer size={16} color={isHotWater ? '#ef4444' : '#38bdf8'} />
            <span className={`aero-sub-val ${isHotWater ? 'hot-water-text' : ''}`}>
              {waterTemp} °C
            </span>
          </div>
        </div>
        </div>

        {/* ====================================================================
            4. RELÓGIO TRAPEZOIDAL CHANFRADO (CENTRO INFERIOR DA FOTO 1)
            ==================================================================== */}
        <div className="aero-bottom-trapezoid-clock">
          <Clock size={14} color="#60a5fa" />
          <span>{game.time ? `${game.time} · ${game.day || 'SEG'}` : "10.20 pm"}</span>
        </div>

        {/* ====================================================================
            5. COMPUTADOR DE BORDO INTEGRADO (DIAGNÓSTICO AUTOMOTIVO)
            ==================================================================== */}
        <div className="aero-bottom-trip-row">
          <div className="aero-trip-cell" title="Hodômetro Total">
            <Gauge size={14} color="#94a3b8" />
            <span className="aero-cell-label">ODO:</span>
            <strong>{Math.round(truck.odometer || 124500).toLocaleString('pt-BR')} km</strong>
          </div>

          <div className={`aero-trip-cell ${isLowAir ? 'cell-alert' : ''}`} title="Pressão do Freio a Ar">
            <Wind size={14} color={isLowAir ? '#ef4444' : '#38bdf8'} />
            <span className="aero-cell-label">AR:</span>
            <strong>{airPressure.toFixed(1)} bar</strong>
          </div>

          <div className="aero-trip-cell" title="Tensão da Bateria (24V)">
            <Zap size={14} color="#facc15" />
            <span className="aero-cell-label">BAT:</span>
            <strong>{(truck.batteryVoltage || 24.4).toFixed(1)} V</strong>
          </div>

          <div className="aero-trip-cell" title="Autonomia Estimada de Combustível">
            <Fuel size={14} color="#00e5ff" />
            <span className="aero-cell-label">AUTON:</span>
            <strong>~{estimatedRange} km</strong>
          </div>
        </div>

      </div>
    </div>
  );
}

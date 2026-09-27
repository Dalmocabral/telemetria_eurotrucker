import React from 'react';

/**
 * Modelo 1: Aero Dual Minimal (Baseado fielmente na Foto 1)
 * Cluster duplo com aros luminosos em ciano e verde, grandes displays digitais
 * centrais, medidores inferiores de combustível e temperatura, setas superiores e relógio hexagonal.
 */
export default function SkinAeroDual({ data }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};
  const game = data?.game || {};

  const speed = Math.round(truck.speed || 0);
  const speedLimit = truck.speedLimit || 80;
  const isOverSpeed = speed > speedLimit;

  const rpm = truck.rpm || 0;

  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelPercent = Math.min(100, Math.max(0, (fuel / fuelCapacity) * 100));

  const waterTemp = Math.round(truck.waterTemperature || 85);
  // Escala de temp de 40°C a 120°C
  const tempPercent = Math.min(100, Math.max(0, ((waterTemp - 40) / 80) * 100));

  return (
    <div className="skin-aero-container">
      <div className="skin-aero-cluster-housing">
        {/* SETAS DIRECIONAIS SUPERIORES (Estilo Foto 1) */}
        <div className="aero-top-signals">
          <svg width="120" height="38" viewBox="0 0 120 38">
            {/* Seta Esquerda */}
            <polygon 
              points="30,8 10,19 30,30 30,23 52,23 52,15 30,15"
              fill={lights.blinkerLeft ? "#22c55e" : "transparent"}
              stroke={lights.blinkerLeft ? "#4ade80" : "#2563eb"}
              strokeWidth="2.5"
              strokeLinejoin="round"
              className={lights.blinkerLeft ? "blink-fast" : ""}
            />
            {/* Seta Direita */}
            <polygon 
              points="90,8 110,19 90,30 90,23 68,23 68,15 90,15"
              fill={lights.blinkerRight ? "#22c55e" : "transparent"}
              stroke={lights.blinkerRight ? "#4ade80" : "#2563eb"}
              strokeWidth="2.5"
              strokeLinejoin="round"
              className={lights.blinkerRight ? "blink-fast" : ""}
            />
          </svg>
        </div>

        {/* DIAL ESQUERDO: VELOCÍMETRO (0 - 300 km/h) */}
        <div className="aero-dial aero-dial-left">
          <svg viewBox="0 0 340 340" className="aero-dial-svg">
            <defs>
              <linearGradient id="aero-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>

            {/* Aro Externo Decorativo */}
            <circle cx="170" cy="170" r="162" fill="none" stroke="#1e293b" strokeWidth="6" />
            <circle cx="170" cy="170" r="156" fill="#0b1120" stroke="#1d4ed8" strokeWidth="2.5" strokeOpacity="0.4" />

            {/* Arco Verde de Cruzeiro (0 a 100 km/h) */}
            <path 
              d="M 52 238 A 140 140 0 0 1 76 96" 
              fill="none" 
              stroke="#22c55e" 
              strokeWidth="4.5" 
              strokeLinecap="round" 
            />

            {/* Arco Ciano de Velocidade Ativa */}
            <path 
              d="M 52 238 A 140 140 0 1 1 288 238" 
              fill="none" 
              stroke="#1e3a8a" 
              strokeWidth="2" 
              strokeDasharray="4 6"
            />

            {/* Tracinhos Graduados (Ticks) */}
            {[0, 40, 80, 100, 140, 180, 220, 260, 300].map((v) => {
              const f = v / 300;
              const angleDeg = -120 + f * 240;
              const angleRad = (angleDeg - 90) * (Math.PI / 180);
              const r1 = 138;
              const r2 = 148;
              const x1 = 170 + Math.cos(angleRad) * r1;
              const y1 = 170 + Math.sin(angleRad) * r1;
              const x2 = 170 + Math.cos(angleRad) * r2;
              const y2 = 170 + Math.sin(angleRad) * r2;

              // Posição do Texto Numérico
              const tx = 170 + Math.cos(angleRad) * 116;
              const ty = 170 + Math.sin(angleRad) * 116 + 5;

              const isRed = v >= 220;

              return (
                <g key={v}>
                  <line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={isRed ? "#ef4444" : "#38bdf8"} 
                    strokeWidth={v === 100 ? 3.5 : 2.2} 
                  />
                  <text 
                    x={tx} y={ty} 
                    fill={isRed ? "#f87171" : "#94a3b8"} 
                    fontSize="13" 
                    fontWeight="700" 
                    textAnchor="middle" 
                    fontFamily="Inter, sans-serif"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Arco Inferior de Combustível */}
            <path 
              d="M 85 272 A 110 110 0 0 1 135 292" 
              fill="none" 
              stroke="#e11d48" 
              strokeWidth="3.5" 
              strokeLinecap="round"
            />
            <path 
              d="M 142 293 A 110 110 0 0 1 255 272" 
              fill="none" 
              stroke="#0284c7" 
              strokeWidth="2.5" 
            />

            {/* Arco Ativo de Combustível */}
            <path 
              d="M 85 272 A 110 110 0 0 1 255 272" 
              fill="none" 
              stroke="#00e5ff" 
              strokeWidth="4" 
              strokeDasharray={`${(fuelPercent / 100) * 180} 300`}
              strokeLinecap="round"
            />
          </svg>

          {/* Display Digital Central de Velocidade */}
          <div className="aero-dial-center">
            <div 
              className="aero-main-speed-val" 
              style={{ color: isOverSpeed ? '#ff1744' : '#ffffff' }}
            >
              {speed}
            </div>
            <div className="aero-main-unit">km/h</div>
          </div>

          {/* Ícone Inferior de Combustível */}
          <div className="aero-bottom-subgauge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.2">
              <path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17M3 22h12M15 9h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L20.5 6.5" />
            </svg>
            <span className="aero-sub-val">{Math.round(fuel)} L</span>
          </div>
        </div>

        {/* DIAL DIREITO: TACÔMETRO / RPM (0 - 9 x1000 RPM) */}
        <div className="aero-dial aero-dial-right">
          <svg viewBox="0 0 340 340" className="aero-dial-svg">
            {/* Aro Externo Decorativo */}
            <circle cx="170" cy="170" r="162" fill="none" stroke="#1e293b" strokeWidth="6" />
            <circle cx="170" cy="170" r="156" fill="#0b1120" stroke="#1d4ed8" strokeWidth="2.5" strokeOpacity="0.4" />

            {/* Arco Verde de Eficiência Econômica (1 a 5) */}
            <path 
              d="M 62 210 A 140 140 0 0 1 170 30" 
              fill="none" 
              stroke="#22c55e" 
              strokeWidth="4.5" 
              strokeLinecap="round" 
            />

            {/* Tracinhos Graduados (0 a 9) */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => {
              const f = v / 9;
              const angleDeg = -120 + f * 240;
              const angleRad = (angleDeg - 90) * (Math.PI / 180);
              const r1 = 138;
              const r2 = 148;
              const x1 = 170 + Math.cos(angleRad) * r1;
              const y1 = 170 + Math.sin(angleRad) * r1;
              const x2 = 170 + Math.cos(angleRad) * r2;
              const y2 = 170 + Math.sin(angleRad) * r2;

              const tx = 170 + Math.cos(angleRad) * 116;
              const ty = 170 + Math.sin(angleRad) * 116 + 5;

              const isRed = v >= 7;

              return (
                <g key={v}>
                  <line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={isRed ? "#ef4444" : "#38bdf8"} 
                    strokeWidth={v === 5 ? 3.5 : 2.2} 
                  />
                  <text 
                    x={tx} y={ty} 
                    fill={isRed ? "#f87171" : "#94a3b8"} 
                    fontSize="14" 
                    fontWeight="700" 
                    textAnchor="middle" 
                    fontFamily="Inter, sans-serif"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Arco Inferior de Temperatura do Motor */}
            <path 
              d="M 85 272 A 110 110 0 0 1 200 293" 
              fill="none" 
              stroke="#0284c7" 
              strokeWidth="2.5" 
            />
            <path 
              d="M 205 292 A 110 110 0 0 1 255 272" 
              fill="none" 
              stroke="#e11d48" 
              strokeWidth="3.5" 
              strokeLinecap="round"
            />
            {/* Arco Ativo de Temperatura */}
            <path 
              d="M 85 272 A 110 110 0 0 1 255 272" 
              fill="none" 
              stroke="#38bdf8" 
              strokeWidth="4" 
              strokeDasharray={`${(tempPercent / 100) * 180} 300`}
              strokeLinecap="round"
            />
          </svg>

          {/* Display Digital Central de RPM e Marcha */}
          <div className="aero-dial-center">
            <div className="aero-main-speed-val aero-rpm-color">
              {truck.displayedGear || (rpm / 1000).toFixed(1)}
            </div>
            <div className="aero-main-unit">
              {truck.displayedGear ? `RPM: ${rpm}` : 'x1000 RPM'}
            </div>
          </div>

          {/* Ícone Inferior de Temperatura */}
          <div className="aero-bottom-subgauge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
            </svg>
            <span className="aero-sub-val">{waterTemp} °C</span>
          </div>
        </div>

        {/* RELÓGIO TRAPEZOIDAL INFERIOR (Estilo Foto 1) */}
        <div className="aero-bottom-clock-badge">
          <span>{game.time || "10.20 pm"}</span>
        </div>
      </div>
    </div>
  );
}

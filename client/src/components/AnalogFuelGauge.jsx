import React from 'react';

/**
 * Medidor Analógico de Combustível Automotivo baseado fielmente na Imagem de Referência.
 * Apresenta arco graduado de 'E' (vazio) a 'F' (cheio), zona vermelha de reserva,
 * ponteiro vermelho iluminado e bomba de combustível com brilho de alerta.
 */
export default function AnalogFuelGauge({ value = 0, liters = 0, capacity = 1140 }) {
  const percent = Math.min(100, Math.max(0, value));
  const isReserve = percent < 15;

  // O ponteiro varre um arco de -60° (vazio no E) até +60° (cheio no F)
  const minAngle = -58;
  const maxAngle = 58;
  const needleAngle = minAngle + (percent / 100) * (maxAngle - minAngle);

  // Geração dos tracinhos graduados (ticks) ao longo do arco
  const totalTicks = 25;
  const ticks = [];
  const radius = 72;
  const centerX = 100;
  const centerY = 90;

  for (let i = 0; i <= totalTicks; i++) {
    const tickFraction = i / totalTicks;
    const angleDeg = minAngle + tickFraction * (maxAngle - minAngle);
    const angleRad = (angleDeg - 90) * (Math.PI / 180);

    const isMajor = (i === 0 || i === 4 || i === 12 || i === 20 || i === totalTicks);
    const tickLength = isMajor ? 12 : 7;
    const isRedZone = tickFraction <= 0.22; // Zona vermelha do E

    const x1 = centerX + Math.cos(angleRad) * (radius - tickLength);
    const y1 = centerY + Math.sin(angleRad) * (radius - tickLength);
    const x2 = centerX + Math.cos(angleRad) * radius;
    const y2 = centerY + Math.sin(angleRad) * radius;

    ticks.push({
      x1, y1, x2, y2,
      isMajor,
      color: isRedZone ? '#ff1744' : '#ffffff',
      strokeWidth: isMajor ? 2.5 : 1.5
    });
  }

  return (
    <div className="analog-fuel-wrapper">
      <svg viewBox="0 0 200 115" className="analog-fuel-svg">
        <defs>
          {/* Brilho da bomba de combustível */}
          <filter id="fuel-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Gradiente do ponteiro vermelho */}
          <linearGradient id="needle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff5252" />
            <stop offset="100%" stopColor="#d50000" />
          </linearGradient>
        </defs>

        {/* Arco de fundo da zona vermelha (Reserva) */}
        <path 
          d="M 38 68 A 72 72 0 0 1 54 48" 
          fill="none" 
          stroke="#ff1744" 
          strokeWidth="3.5" 
          strokeLinecap="round"
        />

        {/* Arco de fundo da zona branca (Normal) */}
        <path 
          d="M 58 44 A 72 72 0 0 1 162 68" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="3.5" 
          strokeLinecap="round"
        />

        {/* Tracinhos da escala (Ticks) */}
        {ticks.map((t, idx) => (
          <line
            key={idx}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.color}
            strokeWidth={t.strokeWidth}
            strokeLinecap="round"
          />
        ))}

        {/* Letra 'E' (Empty / Vazio) à esquerda */}
        <text 
          x="30" 
          y="86" 
          fill="#ff1744" 
          fontSize="17" 
          fontFamily="var(--font-heading)" 
          fontWeight="bold" 
          textAnchor="middle"
        >
          E
        </text>

        {/* Letra 'F' (Full / Cheio) à direita */}
        <text 
          x="170" 
          y="86" 
          fill="#ffffff" 
          fontSize="17" 
          fontFamily="var(--font-heading)" 
          fontWeight="bold" 
          textAnchor="middle"
        >
          F
        </text>

        {/* Ícone da Bomba de Combustível iluminado no centro */}
        <g 
          transform="translate(90, 42) scale(0.85)" 
          filter={isReserve ? "url(#fuel-glow)" : "none"}
        >
          {/* Bomba de combustível */}
          <path 
            d="M3 2v14h7V2H3zm2 2h3v4H5V4zm8 1v5.5a1.5 1.5 0 0 0 3 0V7.2l1.6 1.6.7-.7-2.4-2.4-.2-.7V5a2 2 0 0 0-2-2h-.7z"
            fill={isReserve ? "#ff1744" : "#8a99b5"} 
            className={isReserve ? "blink" : ""}
          />
        </g>

        {/* Ponteiro Giratório Vermelho */}
        <g transform={`rotate(${needleAngle}, ${centerX}, ${centerY})`} style={{ transition: 'transform 0.25s ease-out' }}>
          {/* Linha do ponteiro estilizada e afilada */}
          <polygon 
            points="98,90 100,22 102,90" 
            fill="url(#needle-gradient)" 
            filter="drop-shadow(0px 0px 4px rgba(255, 23, 68, 0.7))"
          />
          {/* Ponta iluminada */}
          <circle cx="100" cy="22" r="1.5" fill="#ffffff" />
        </g>

        {/* Pino Central do Eixo do Ponteiro */}
        <circle cx={centerX} cy={centerY} r="9" fill="#0d111a" stroke="#222b3d" strokeWidth="2.5" />
        <circle cx={centerX} cy={centerY} r="4" fill="#ff1744" />
      </svg>

      {/* Exibição Digital Compacta */}
      <div className="analog-fuel-info">
        <span className="analog-fuel-val">{Math.round(percent)}%</span>
        <span className="analog-fuel-liters">{Math.round(liters)} L</span>
      </div>
    </div>
  );
}

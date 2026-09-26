import React from 'react';
import { 
  ArrowLeft, ArrowRight, Sun, Disc, 
  Gauge, ShieldAlert 
} from 'lucide-react';
import AnalogFuelGauge from '../AnalogFuelGauge';

/**
 * Modelo 0: Padrão ETS2 Pro
 * O painel clássico e limpo original com velocímetro central, barra de RPM,
 * mostrador analógico de combustível e telltales superiores.
 */
export default function SkinDefault({ data, isMinimal = false }) {
  const truck = data?.truck || {};
  const lights = data?.lights || {};

  const speed = truck.speed || 0;
  const speedLimit = truck.speedLimit || 80;
  
  const isSlightlyOverSpeed = speed > speedLimit && speed <= (speedLimit + 7);
  const isDangerOverSpeed = speed > (speedLimit + 7);
  const isOverSpeed = speed > speedLimit;

  let speedColor = '#ffffff';
  let speedGlow = 'rgba(0, 229, 255, 0.35)';
  if (isDangerOverSpeed) {
    speedColor = 'var(--accent-red)';
    speedGlow = 'rgba(255, 23, 68, 0.7)';
  } else if (isSlightlyOverSpeed) {
    speedColor = 'var(--accent-amber)';
    speedGlow = 'rgba(255, 171, 0, 0.7)';
  }

  const rpm = truck.rpm || 0;
  const maxRpm = truck.maxRpm || 2500;
  const rpmPercent = Math.min(100, Math.max(0, (rpm / maxRpm) * 100));

  let rpmColorClass = 'rpm-economy';
  if (rpm > 1850) {
    rpmColorClass = 'rpm-danger';
  } else if (rpm > 1450) {
    rpmColorClass = 'rpm-power';
  }

  const fuel = truck.fuel || 0;
  const fuelCapacity = truck.fuelCapacity || 1140;
  const fuelPercent = Math.min(100, Math.max(0, (fuel / fuelCapacity) * 100));

  return (
    <div className={`default-skin-wrapper ${isMinimal ? 'cluster-minimal' : ''}`}>
      {/* 1. Barra Superior de Luzes de Alerta */}
      <div className="warning-lights-bar">
        <div className={`light-icon ${lights.blinkerLeft ? 'active-green blink' : ''}`}>
          <ArrowLeft size={isMinimal ? 18 : 22} />
          <span>Seta E</span>
        </div>

        <div className={`light-icon ${lights.beamLow ? 'active-green' : ''}`}>
          <Sun size={isMinimal ? 16 : 20} />
          <span>Baixo</span>
        </div>

        <div className={`light-icon ${lights.beamHigh ? 'active-blue' : ''}`}>
          <Sun size={isMinimal ? 16 : 20} />
          <span>Alto</span>
        </div>

        <div className={`light-icon ${truck.parkBrake ? 'active-red' : ''}`}>
          <Disc size={isMinimal ? 16 : 20} />
          <span>Freio P</span>
        </div>

        <div className={`light-icon ${truck.retarderLevel > 0 ? 'active-amber' : ''}`}>
          <Disc size={isMinimal ? 16 : 20} />
          <span>Retarder</span>
        </div>

        <div className={`light-icon ${truck.cruiseControl ? 'active-green' : ''}`}>
          <Gauge size={isMinimal ? 16 : 20} />
          <span>Cruise</span>
        </div>

        <div className={`light-icon ${truck.fuelWarning ? 'active-red blink' : ''}`}>
          <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>⛽</span>
          <span>Reserva</span>
        </div>

        <div className={`light-icon ${lights.blinkerRight ? 'active-green blink' : ''}`}>
          <ArrowRight size={isMinimal ? 18 : 22} />
          <span>Seta D</span>
        </div>
      </div>

      {/* 2. Palco Central: Velocímetro Gigante + Medidor Analógico de Combustível */}
      <div className="cluster-main-stage">
        
        {/* Velocímetro Central com Placa de Limite e Tacômetro */}
        <div className={`card-hud speed-center-card ${isOverSpeed ? 'card-overspeed' : ''}`}>
          <div className={`speed-limit-badge ${isOverSpeed ? 'over-speed' : ''}`} title="Limite da Via">
            {speedLimit}
          </div>

          <div className="speed-display-group">
            <span 
              className="speed-digital-number" 
              style={{ color: speedColor, textShadow: `0 0 35px ${speedGlow}` }}
            >
              {Math.round(speed)}
            </span>
            <span className="speed-unit" style={{ color: isOverSpeed ? speedColor : 'var(--accent-cyan)' }}>
              KM / H
            </span>

            {isOverSpeed && (
              <div className="overspeed-warning-pill blink">
                <ShieldAlert size={16} />
                <span>⚠️ ACIMA DO LIMITE ({speedLimit} KM/H)</span>
              </div>
            )}
          </div>

          <div className="gear-badge-wrapper">
            <div className="gear-badge" title="Marcha Engatada">
              {truck.displayedGear || 'N'}
            </div>
            <div className="gear-suggested">
              Sugerida: <strong>D{truck.suggestedGear || 1}</strong>
            </div>
          </div>

          <div className="rpm-section">
            <div className="rpm-header">
              <span>RPM DO MOTOR</span>
              <span className="rpm-number">{rpm}</span>
            </div>
            <div className="rpm-bar-track">
              <div 
                className={`rpm-bar-fill ${rpmColorClass}`} 
                style={{ width: `${rpmPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Medidor Analógico de Combustível Compacto */}
        <div className="card-hud analog-fuel-card">
          <div className="analog-fuel-card-title">
            <span>COMBUSTÍVEL</span>
          </div>

          <AnalogFuelGauge 
            value={fuelPercent} 
            liters={fuel} 
            capacity={fuelCapacity} 
          />
        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  Sun, Disc, Gauge, Power, AlertTriangle, CloudRain,
  Camera, Palette, X, Check, ChevronDown
} from 'lucide-react';
import { useRadarWarning } from '../utils/useRadarWarning';
import { CLUSTER_SKINS } from './skins';

export default function SpeedometerView({ data, onSendAction, isMinimal = false }) {
  // 1. Alerta de Radar em tempo real no Modo Painel (com contagem regressiva em metros e voz)
  // Ativado se não for minimal (evita duplicar fala e visual na tela mista)
  const approachingRadar = useRadarWarning(data?.placement, !isMinimal);

  // 2. Seletor de Modelo / Skin do Painel (Persistente no localStorage)
  const [currentSkinId, setCurrentSkinId] = useState(() => {
    return localStorage.getItem('ets2_cluster_skin') || 'default';
  });
  const [isSkinModalOpen, setIsSkinModalOpen] = useState(false);
  const [wiperLevel, setWiperLevel] = useState(0);

  if (!data) return <div className="cluster-container"><p>Carregando telemetria...</p></div>;

  const truck = data.truck || {};
  const lights = data.lights || {};
  const rpm = truck.rpm || 0;
  const isEngineOn = rpm > 350;
  const isHazardOn = lights.blinkerLeft && lights.blinkerRight;

  // Lógica do botão unificado de Faróis: Desligado -> Lanterna -> Farol Baixo -> Farol Alto -> Desligado
  let lightStage = 0;
  let lightLabel = 'Farol Off';
  let lightClass = '';
  if (lights.beamHigh) {
    lightStage = 3;
    lightLabel = 'Farol Alto';
    lightClass = 'tile-active-blue';
  } else if (lights.beamLow) {
    lightStage = 2;
    lightLabel = 'Farol Baixo';
    lightClass = 'tile-active-green';
  } else if (lights.parkingLights) {
    lightStage = 1;
    lightLabel = 'Lanterna';
    lightClass = 'tile-active-amber';
  }

  const handleCycleLights = () => {
    if (lightStage === 0) {
      handleAction('light');
    } else if (lightStage === 1) {
      handleAction('light');
    } else if (lightStage === 2) {
      handleAction('highbeam');
    } else {
      handleAction('highbeam');
      setTimeout(() => handleAction('light'), 120);
    }
  };

  // Lógica do botão unificado de Limpador: Desligado -> Nível 1 -> Nível 2 -> Nível 3 -> Desligado
  const handleCycleWiper = () => {
    const next = (wiperLevel + 1) % 4;
    setWiperLevel(next);
    handleAction('wipers');
  };
  const isWiperActive = truck.wipers || wiperLevel > 0;
  const displayWiperLevel = wiperLevel > 0 ? wiperLevel : (truck.wipers ? 1 : 0);
  const wiperLabel = displayWiperLevel > 0 ? `Limpador ${displayWiperLevel}` : 'Limpador';

  // Piloto Automático Inteligente sincronizado com placas de trânsito
  const isAutoPilotOn = Boolean(data.autopilot);

  // Seleciona a skin ativa
  const activeSkinId = isMinimal ? 'default' : currentSkinId;
  const selectedSkin = CLUSTER_SKINS.find(s => s.id === activeSkinId) || CLUSTER_SKINS[0];
  const SkinComponent = selectedSkin.Component;

  const handleSelectSkin = (skinId) => {
    setCurrentSkinId(skinId);
    localStorage.setItem('ets2_cluster_skin', skinId);
    setIsSkinModalOpen(false);
  };

  const handleAction = (actionName) => {
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
    if (onSendAction) {
      onSendAction(actionName);
    }
  };

  return (
    <div className={`cluster-container ${isMinimal ? 'cluster-minimal' : ''}`}>
      {/* ALERTA ANTECIPADO DE RADAR DE VELOCIDADE NO PAINEL (Oculto no modo misto para não duplicar com o mapa) */}
      {!isMinimal && approachingRadar && (
        <div className="radar-ahead-warning-card blink-alert panel-radar-alert">
          <div className="radar-camera-badge">
            <Camera size={26} color="#ffffff" />
          </div>
          <div className="radar-ahead-details">
            <div className="radar-title-row">
              <h4>RADAR À FRENTE!</h4>
              <span className="radar-limit-pill">{approachingRadar.limit} KM/H</span>
            </div>
            <p>Distância: <strong>{approachingRadar.distance} metros</strong> • Reduza a velocidade!</p>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE DE ESCOLHA DE MODELO DO PAINEL (Apenas no modo Painel solo) */}
      {!isMinimal && (
        <div className="skin-selector-toolbar">
          <button 
            id="btn-open-skin-modal"
            className="skin-selector-pill-btn"
            onClick={() => setIsSkinModalOpen(true)}
            title="Escolher Modelo de Painel"
          >
            <Palette size={16} color={selectedSkin.accentColor} />
            <span>Modelo: <strong>{selectedSkin.name}</strong></span>
            <ChevronDown size={14} />
          </button>
        </div>
      )}

      {/* COMPONENTE DA SKIN SELECIONADA */}
      <div className="skin-viewport-wrapper">
        <SkinComponent data={data} isMinimal={isMinimal} />
      </div>

      {/* 3. Rodapé com os BOTÕES CLICÁVEIS DE CONTROLE DO CAMINHÃO */}
      <div className="interactive-bottom-bar">
        {/* Ligar/Desligar Motor (Tecla E) */}
        <button 
          id="btn-bot-engine"
          className={`btn-action-tile ${isEngineOn ? 'tile-active-green' : ''}`}
          onClick={() => handleAction('engine')}
          title="Ligar / Desligar Motor (Tecla E)"
        >
          <Power size={22} />
          <span>{isEngineOn ? 'Motor Ligado' : 'Ligar Motor'}</span>
        </button>

        {/* Único Botão de Faróis com Estágios (Desligado -> Lanterna -> Baixo -> Alto) */}
        <button 
          id="btn-bot-light"
          className={`btn-action-tile ${lightClass}`}
          onClick={handleCycleLights}
          title={`Farol (Clique para alternar: Lanterna / Baixo / Alto / Desligado) - Estágio: ${lightLabel}`}
        >
          <Sun size={22} />
          <span>{lightLabel}</span>
        </button>

        {/* Pisca-Alerta (Tecla F) */}
        <button 
          id="btn-bot-hazard"
          className={`btn-action-tile ${isHazardOn ? 'tile-active-amber blink' : ''}`}
          onClick={() => handleAction('hazard')}
          title="Pisca-Alerta (Tecla F)"
        >
          <AlertTriangle size={22} />
          <span>Pisca-Alerta</span>
        </button>

        {/* Freio de Mão (Tecla Espaço) */}
        <button 
          id="btn-bot-handbrake"
          className={`btn-action-tile ${truck.parkBrake ? 'tile-active-red' : ''}`}
          onClick={() => handleAction('handbrake')}
          title="Freio de Estacionamento (Tecla Espaço)"
        >
          <Disc size={22} />
          <span>Freio P</span>
        </button>

        {/* Cruise Control (Tecla C) */}
        <button 
          id="btn-bot-cruise"
          className={`btn-action-tile ${truck.cruiseControl ? 'tile-active-green' : ''}`}
          onClick={() => handleAction('cruise')}
          title="Piloto Automático (Tecla C)"
        >
          <Gauge size={22} />
          <span>Cruise</span>
        </button>

        {/* Auto-Pilot Inteligente sincronizado com placas de trânsito (Cruise + Auto-Pilot) */}
        <button 
          id="btn-bot-autopilot"
          className={`btn-action-tile ${isAutoPilotOn ? 'tile-active-blue' : ''}`}
          onClick={() => handleAction('autopilot')}
          title="Piloto Automático Inteligente por Placas (Acelera/Reduz conforme placas com Cruise ativo)"
        >
          <Gauge size={22} />
          <span>{isAutoPilotOn ? 'AutoPilot ON' : 'AutoPilot'}</span>
        </button>

        {/* Único Botão de Limpador com Níveis (Desligado -> 1 -> 2 -> 3) */}
        <button 
          id="btn-bot-wipers"
          className={`btn-action-tile ${displayWiperLevel > 0 ? 'tile-active-green' : ''}`}
          onClick={handleCycleWiper}
          title="Limpadores (Níveis: 1, 2, 3 e Desligado)"
        >
          <CloudRain size={22} />
          <span>{wiperLabel}</span>
        </button>
      </div>

      {/* MODAL DE SELEÇÃO DOS 10 MODELOS DE PAINEL */}
      {isSkinModalOpen && !isMinimal && (
        <div className="skin-modal-backdrop" onClick={() => setIsSkinModalOpen(false)}>
          <div className="skin-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="skin-modal-header">
              <div className="skin-modal-title">
                <Palette size={22} color="#00e5ff" />
                <h3>Escolha o Modelo do Painel</h3>
              </div>
              <button 
                className="skin-modal-close-btn"
                onClick={() => setIsSkinModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p className="skin-modal-subtitle">
              Selecione o estilo visual que preferir para o seu velocímetro e instrumentos (10 modelos disponíveis):
            </p>

            <div className="skin-grid-list">
              {CLUSTER_SKINS.map((s) => {
                const isCurrent = s.id === currentSkinId;
                return (
                  <div 
                    key={s.id} 
                    className={`skin-card-item ${isCurrent ? 'skin-card-active' : ''}`}
                    onClick={() => handleSelectSkin(s.id)}
                    style={{ borderColor: isCurrent ? s.accentColor : 'rgba(255,255,255,0.1)' }}
                  >
                    <div className="skin-card-top-row">
                      <span className="skin-badge-pill" style={{ color: s.accentColor, background: `${s.accentColor}22` }}>
                        {s.category}
                      </span>
                      {isCurrent && (
                        <div className="skin-check-circle" style={{ background: s.accentColor }}>
                          <Check size={14} color="#000" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    
                    <h4 className="skin-card-name">{s.name}</h4>
                    <p className="skin-card-desc">{s.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Gauge, MapPin, LayoutGrid, Maximize, Minimize, QrCode } from 'lucide-react';

export default function Header({ 
  viewMode, 
  setViewMode, 
  connectionStatus, 
  onOpenQr, 
  isFullscreen, 
  toggleFullscreen 
}) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <h1 className="brand-title">
          ETS2 <span>TELEMETRIA</span>
        </h1>
        
        <div className={`badge-status ${connectionStatus}`}>
          <div className="pulse-dot"></div>
          {connectionStatus === 'connected' && 'Jogo Conectado'}
          {connectionStatus === 'simulated' && 'Modo Demonstração'}
          {connectionStatus === 'offline' && 'Desconectado'}
        </div>
      </div>

      {/* Seletor de Telas */}
      <nav className="view-tabs" aria-label="Seletor de Telas">
        <button 
          id="btn-tab-cluster"
          className={`tab-btn ${viewMode === 'cluster' ? 'active' : ''}`}
          onClick={() => setViewMode('cluster')}
          title="Painel e Velocímetro (Ideal para Celular 1)"
        >
          <Gauge size={18} />
          <span>Painel</span>
        </button>

        <button 
          id="btn-tab-gps"
          className={`tab-btn ${viewMode === 'gps' ? 'active' : ''}`}
          onClick={() => setViewMode('gps')}
          title="GPS e Mapa (Ideal para Celular 2)"
        >
          <MapPin size={18} />
          <span>GPS / Mapa</span>
        </button>

        <button 
          id="btn-tab-split"
          className={`tab-btn ${viewMode === 'split' ? 'active' : ''}`}
          onClick={() => setViewMode('split')}
          title="Modo Misto (Ideal para Tablet)"
        >
          <LayoutGrid size={18} />
          <span>Misto</span>
        </button>
      </nav>

      {/* Ações Rápidas */}
      <div className="header-actions">
        <button 
          id="btn-open-qr"
          className="icon-btn" 
          onClick={onOpenQr} 
          title="Conectar outro celular via QR Code"
        >
          <QrCode size={20} />
        </button>

        <button 
          id="btn-toggle-fullscreen"
          className="icon-btn" 
          onClick={toggleFullscreen} 
          title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>
    </header>
  );
}

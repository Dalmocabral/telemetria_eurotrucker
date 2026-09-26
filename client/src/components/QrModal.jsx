import React from 'react';
import { X, Smartphone, Wifi } from 'lucide-react';

export default function QrModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const currentHost = window.location.hostname;
  const currentPort = window.location.port || '5173';
  const fullUrl = `http://${currentHost}:${currentPort}`;
  const qrApiUrl = `http://${currentHost}:8000/api/qr?port=${currentPort}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Smartphone size={24} color="#00e5ff" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem' }}>
            Conectar Outro Celular / Tablet
          </h2>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 12 }}>
          Conecte o seu celular na mesma rede <strong>Wi-Fi</strong> do computador e aponte a câmera para o QR Code abaixo:
        </p>

        <img 
          src={qrApiUrl} 
          alt="QR Code de Conexão" 
          className="qr-code-img"
          onError={(e) => {
            // Se o backend Python não estiver rodando no momento
            e.target.style.display = 'none';
          }}
        />

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
          Ou digite este endereço no navegador do celular:
        </p>

        <div className="url-box">
          {fullUrl}
        </div>

        <button id="btn-close-qr-modal" className="modal-close-btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary capturou erro]', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetView = () => {
    localStorage.setItem('ets2_view_mode', 'cluster');
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          background: '#07090e',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            <AlertTriangle size={54} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px' }}>
              Falha ao Carregar Visualização
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '20px' }}>
              Ocorreu uma instabilidade momentânea na telemetria do jogo. Os controles continuam operacionais.
            </p>

            {this.state.error && (
              <div style={{
                background: '#0d121c',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: '#f87171',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '24px'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#00e5ff',
                  color: '#07090e',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={18} />
                <span>Recarregar Painel</span>
              </button>

              <button
                onClick={this.handleResetView}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <LayoutDashboard size={18} />
                <span>Voltar ao Velocímetro</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

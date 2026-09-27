/**
 * Gerenciador Confiável de Tela Sempre Ativa (Wake Lock & Fallback) para o TruckPilot Pro.
 * 
 * Trata rigorosamente as restrições do W3C e navegadores móveis:
 * 1. Screen Wake Lock API (navigator.wakeLock) exige Contexto Seguro (HTTPS ou localhost).
 *    Em conexões HTTP de rede local (ex: http://192.168.1.X:8000), a API nativa é bloqueada pelo navegador.
 * 2. Estados honestos e transparentes: NUNCA exibe "Tela Ativa" sem confirmação real da API ou do player.
 * 3. Fallback de micro-vídeo é opcional, testável, acionado por gesto e pode ser desligado.
 * 4. Padrão Observer com instância única (Singleton) para evitar solicitações conflitantes entre App e GpsView.
 */

export const WAKE_LOCK_STATES = {
  IDLE: 'idle',                             // Não solicitado
  ACTIVE_NATIVE: 'active_native',           // API nativa navigator.wakeLock ativa
  ACTIVE_MEDIA: 'active_media',             // Vídeo auxiliar em loop reproduzindo
  UNAVAILABLE_HTTP: 'unavailable_http',     // Bloqueado pelo navegador por estar em HTTP (requer HTTPS)
  UNAVAILABLE_BROWSER: 'unavailable_browser',// Navegador antigo sem suporte a Wake Lock
  DENIED: 'denied',                         // Permissão negada pelo sistema operacional / bateria
  RELEASED: 'released',                     // Liberado pelo sistema operacional (ex: troca de aba ou bloqueio)
  DISABLED: 'disabled',                     // Desligado conscientemente pelo usuário
};

// Micro-vídeo H.264 silencioso de 1s em base64 (usado apenas como fallback auxiliar opcional)
const FALLBACK_VIDEO_B64 = 
  "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAAhmcmVlAAAGD21kYXQAAACAAxAA" +
  "AAADAAABAAEAAP//AAAAGmZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAAhmcmVlAAAGB21kYXQAAACAAxAAAAAD" +
  "AAABAAEAAP//AAAAGmZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAAhmcmVlAAAF9W1kYXQAAACAAxAAAAADAAAB" +
  "AAEAAP//AAAAO21vb3YAAABsbXZoZAAAAAB06U28dOlNvAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AdHJhawAAAFx0a2hkAAAA" +
  "BXTpTbx06U28AAAAAQAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAQAAAAAAAAAAAAAAAEAAAAAEW1kaWEAAAAgc2hkcgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJWhkbHIAAAAA" +
  "AAAAAHNvdW4AAAAAAAAAAAAAAABTb3VuZEhhbmRsZXIAAAAC221pbmYAAAAQc21oZAAAAAAAAAAAAAAAJGRpbmYA" +
  "AAAcZHJlZgAAAAAAAAABAAAADGRybXIAAAAAAAAAAALfc3RibAAAAMZzdHNkAAAAAAAAAAEAAAC2bXA0YQAAAAAA" +
  "AAAAAgAAAAAAAAAAAAAAAQAAAAAAAAAAAEAAAABvdW5kAAABAGVzZHMAAAAAAAOAMAAAAAAAAgAAAAYBAAAAAgEAA" +
  "AAAAAAAFgAAAcgAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARc3R0cwAAAAAAAAABAAAAAQAAA+gAAAAUc3Rz" +
  "YwAAAAAAAAABAAAAAQAAAAEAAAABAAAAHHN0c3oAAAAAAAAAAAAAAAEAAAAYAAAAGHN0Y28AAAAAAAAAAQAAADwA" +
  "AA==";

class WakeLockManager {
  constructor() {
    this.state = WAKE_LOCK_STATES.IDLE;
    this.userWantsActive = true;             // Preferência do usuário (padrão ligada)
    this.allowMediaFallback = true;          // Permite vídeo auxiliar quando em HTTP
    this.sentinel = null;
    this.videoElement = null;
    this.listeners = new Set();
    this.isContextSecure = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false;
    this.isNativeSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    this.errorMessage = null;

    if (typeof window !== 'undefined') {
      this._initLifecycleListeners();
    }
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.getStateInfo());
      } catch (e) {
        console.warn('[WakeLockManager] Erro no listener:', e);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Notifica imediatamente o estado atual
    listener(this.getStateInfo());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStateInfo() {
    let label = 'Tela Desligada';
    let type = 'off';
    let detail = 'O tablet pode apagar a tela conforme o tempo de inatividade padrão do sistema.';

    switch (this.state) {
      case WAKE_LOCK_STATES.ACTIVE_NATIVE:
        label = 'Tela Ativa (API Nativa)';
        type = 'active';
        detail = 'Bloqueio de tela nativo concedido pelo navegador em contexto seguro.';
        break;
      case WAKE_LOCK_STATES.ACTIVE_MEDIA:
        label = 'Tela Ativa (Vídeo Auxiliar)';
        type = 'active-media';
        detail = 'Mantida ativa por reprodução de mídia em segundo plano (útil em conexões HTTP Wi-Fi).';
        break;
      case WAKE_LOCK_STATES.UNAVAILABLE_HTTP:
        label = 'Inseguro (HTTP)';
        type = 'warning';
        detail = 'A API nativa do navegador é bloqueada em conexões HTTP comuns fora do localhost. Use HTTPS ou ative o vídeo auxiliar.';
        break;
      case WAKE_LOCK_STATES.UNAVAILABLE_BROWSER:
        label = 'Não Suportado';
        type = 'error';
        detail = 'Este navegador não oferece suporte à Screen Wake Lock API do W3C.';
        break;
      case WAKE_LOCK_STATES.DENIED:
        label = 'Permissão Negada';
        type = 'error';
        detail = this.errorMessage || 'O sistema operacional ou navegador negou o bloqueio de tela (verifique modo de economia de energia).';
        break;
      case WAKE_LOCK_STATES.RELEASED:
        label = 'Liberado pelo Sistema';
        type = 'warning';
        detail = 'O bloqueio foi liberado pelo sistema (toque na tela para reativar).';
        break;
      case WAKE_LOCK_STATES.DISABLED:
        label = 'Desativado pelo Usuário';
        type = 'disabled';
        detail = 'Você desligou a trava de tela. O aparelho seguirá o desligamento padrão.';
        break;
      default:
        label = 'Tela Normal';
        type = 'off';
        detail = 'Aguardando ação para ativar o bloqueio de tela.';
        break;
    }

    return {
      state: this.state,
      label,
      type,
      detail,
      isActive: this.state === WAKE_LOCK_STATES.ACTIVE_NATIVE || this.state === WAKE_LOCK_STATES.ACTIVE_MEDIA,
      isNative: this.state === WAKE_LOCK_STATES.ACTIVE_NATIVE,
      isMedia: this.state === WAKE_LOCK_STATES.ACTIVE_MEDIA,
      isSecureContext: this.isContextSecure,
      isNativeSupported: this.isNativeSupported,
      allowMediaFallback: this.allowMediaFallback,
      userWantsActive: this.userWantsActive,
    };
  }

  async requestWakeLock(isUserGesture = false) {
    this.userWantsActive = true;
    this.errorMessage = null;

    // 1. Tenta a Screen Wake Lock API oficial se suportada e em contexto seguro
    if (this.isNativeSupported && this.isContextSecure) {
      try {
        if (!this.sentinel) {
          const sentinel = await navigator.wakeLock.request('screen');
          this.sentinel = sentinel;
          this.state = WAKE_LOCK_STATES.ACTIVE_NATIVE;

          sentinel.addEventListener('release', () => {
            this.sentinel = null;
            if (this.userWantsActive) {
              this.state = WAKE_LOCK_STATES.RELEASED;
              this._notify();
            }
          });

          this._cleanMediaFallback();
          this._notify();
          return this.getStateInfo();
        } else {
          this.state = WAKE_LOCK_STATES.ACTIVE_NATIVE;
          this._notify();
          return this.getStateInfo();
        }
      } catch (err) {
        console.warn('[WakeLockManager] Falha na API Nativa:', err.name, err.message);
        this.errorMessage = `${err.name}: ${err.message}`;
        this.state = WAKE_LOCK_STATES.DENIED;
      }
    } else if (this.isNativeSupported && !this.isContextSecure) {
      // Diagnóstico honesto para HTTP
      this.state = WAKE_LOCK_STATES.UNAVAILABLE_HTTP;
    } else {
      this.state = WAKE_LOCK_STATES.UNAVAILABLE_BROWSER;
    }

    // 2. Se a API nativa não estiver disponível ou falhar, e o fallback de mídia for permitido
    if (this.allowMediaFallback && (this.state === WAKE_LOCK_STATES.UNAVAILABLE_HTTP || this.state === WAKE_LOCK_STATES.UNAVAILABLE_BROWSER || this.state === WAKE_LOCK_STATES.DENIED)) {
      const mediaStarted = await this._startMediaFallback(isUserGesture);
      if (mediaStarted) {
        this.state = WAKE_LOCK_STATES.ACTIVE_MEDIA;
      }
    }

    this._notify();
    return this.getStateInfo();
  }

  async _startMediaFallback(isUserGesture = false) {
    if (typeof document === 'undefined') return false;

    try {
      if (!this.videoElement) {
        const video = document.createElement('video');
        video.setAttribute('title', 'TruckPilot NoSleep Auxiliary Media');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('loop', '');
        video.setAttribute('muted', '');
        video.muted = true;
        video.volume = 0;
        video.style.position = 'fixed';
        video.style.left = '-9999px';
        video.style.top = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0.01';
        video.style.pointerEvents = 'none';
        video.src = FALLBACK_VIDEO_B64;
        document.body.appendChild(video);
        this.videoElement = video;
      }

      await this.videoElement.play();
      // Confirmação real: só reporta sucesso se o vídeo realmente não estiver pausado
      return !this.videoElement.paused;
    } catch (e) {
      // Em navegadores móveis sem toque prévio, o autoplay pode ser bloqueado
      console.log('[WakeLockManager] Vídeo auxiliar aguardando toque do usuário:', e.message);
      return false;
    }
  }

  _cleanMediaFallback() {
    if (this.videoElement) {
      try {
        this.videoElement.pause();
        if (this.videoElement.parentNode) {
          this.videoElement.parentNode.removeChild(this.videoElement);
        }
      } catch (e) {}
      this.videoElement = null;
    }
  }

  release() {
    this.userWantsActive = false;
    this.state = WAKE_LOCK_STATES.DISABLED;

    if (this.sentinel) {
      this.sentinel.release().catch(() => {});
      this.sentinel = null;
    }
    this._cleanMediaFallback();
    this._notify();
  }

  toggle(isUserGesture = true) {
    if (this.userWantsActive && (this.state === WAKE_LOCK_STATES.ACTIVE_NATIVE || this.state === WAKE_LOCK_STATES.ACTIVE_MEDIA)) {
      this.release();
    } else {
      this.requestWakeLock(isUserGesture);
    }
  }

  setAllowMediaFallback(allowed) {
    this.allowMediaFallback = Boolean(allowed);
    if (!this.allowMediaFallback && this.state === WAKE_LOCK_STATES.ACTIVE_MEDIA) {
      this._cleanMediaFallback();
      this.state = this.isContextSecure ? WAKE_LOCK_STATES.IDLE : WAKE_LOCK_STATES.UNAVAILABLE_HTTP;
      this._notify();
    } else if (this.allowMediaFallback && this.userWantsActive && this.state !== WAKE_LOCK_STATES.ACTIVE_NATIVE) {
      this.requestWakeLock(true);
    }
  }

  _initLifecycleListeners() {
    // 1. Reaquisição automática quando a página volta a ficar visível
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.userWantsActive) {
        // Se a tela estava ativa por API nativa ou estava liberada, re-solicita
        if (this.isContextSecure && this.isNativeSupported) {
          this.requestWakeLock(false);
        } else if (this.allowMediaFallback && this.videoElement && this.videoElement.paused) {
          this.videoElement.play().catch(() => {});
        }
      }
    });

    // 2. Disparador amigável em gestos do usuário para browsers que exigem user-activation
    const onUserInteraction = () => {
      if (this.userWantsActive && !this.sentinel && (!this.videoElement || this.videoElement.paused)) {
        this.requestWakeLock(true);
      }
    };
    window.addEventListener('click', onUserInteraction, { passive: true });
    window.addEventListener('touchend', onUserInteraction, { passive: true });
  }
}

// Exporta instância única singleton
export const wakeLockManager = new WakeLockManager();

// Atalhos convenientes de compatibilidade
export function requestScreenWakeLock() {
  return wakeLockManager.requestWakeLock(true);
}

export function releaseScreenWakeLock() {
  wakeLockManager.release();
}

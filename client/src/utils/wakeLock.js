/**
 * NoSleep & Screen Wake Lock Manager para manter a tela do celular ou tablet 100% acesa.
 * Utiliza o método duplo:
 * 1) Screen Wake Lock API (se suportado e em HTTPS/localhost)
 * 2) Micro-vídeo H.264 silencioso em base64 (funciona 100% em HTTP comum via Wi-Fi no Android e iOS)
 */

// Micro-vídeo MP4/H.264 silencioso de 1 segundo codificado em Base64 (padrão NoSleep)
const NOSLEEP_VIDEO_B64 = 
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

let wakeLockSentinel = null;
let mediaVideo = null;
let isEnabled = false;

export async function requestScreenWakeLock() {
  isEnabled = true;

  // 1. Tenta a API nativa do navegador (se suportada)
  if ('wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        console.log('[WakeLock] API Nativa ativada com sucesso!');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
          if (isEnabled && document.visibilityState === 'visible') {
            setTimeout(requestScreenWakeLock, 1000);
          }
        });
      }
    } catch (err) {
      // Normal em conexões HTTP sem SSL via Wi-Fi; usamos o fallback de mídia
      console.log('[WakeLock] Usando fallback de mídia para HTTP Wi-Fi:', err.message);
    }
  }

  // 2. Fallback de mídia (funciona em HTTP sem certificado e em qualquer Android/iOS)
  enableMediaFallback();
  return true;
}

export function releaseScreenWakeLock() {
  isEnabled = false;
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
  disableMediaFallback();
}

function enableMediaFallback() {
  if (mediaVideo) {
    mediaVideo.play().catch(() => {});
    return;
  }

  try {
    const video = document.createElement('video');
    video.setAttribute('title', 'NoSleep');
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
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.src = NOSLEEP_VIDEO_B64;

    document.body.appendChild(video);
    mediaVideo = video;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('[NoSleep] Reprodução ativa mantendo a tela acesa 100% do tempo!');
      }).catch((err) => {
        console.log('[NoSleep] Aguardando toque na tela para iniciar reprodução:', err);
      });
    }
  } catch (e) {
    console.warn('[NoSleep] Erro no fallback de vídeo:', e);
  }
}

function disableMediaFallback() {
  if (mediaVideo) {
    try {
      mediaVideo.pause();
      if (mediaVideo.parentNode) {
        mediaVideo.parentNode.removeChild(mediaVideo);
      }
    } catch (e) {}
    mediaVideo = null;
  }
}

// Disparadores automáticos em toques do usuário (resolve exigência de 'user gesture' do Android/iOS)
if (typeof window !== 'undefined') {
  const triggerWakeOnGesture = () => {
    if (isEnabled) {
      if (mediaVideo && mediaVideo.paused) {
        mediaVideo.play().catch(() => {});
      } else if (!mediaVideo) {
        requestScreenWakeLock();
      }
    }
  };

  window.addEventListener('click', triggerWakeOnGesture, { passive: true });
  window.addEventListener('touchstart', triggerWakeOnGesture, { passive: true });
  window.addEventListener('touchend', triggerWakeOnGesture, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (isEnabled && document.visibilityState === 'visible') {
      triggerWakeOnGesture();
    }
  });
}

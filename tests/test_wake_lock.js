/**
 * Testes automatizados do gerenciador de tela sempre ativa (WakeLockManager).
 * Valida aquisição nativa, contexto inseguro HTTP, fallback de mídia opcional,
 * liberação pelo sistema operacional, retorno de visibilidade e cancelamento pelo usuário.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Configura mocks de ambiente de navegador para Node.js antes de importar o módulo
globalThis.window = {
  isSecureContext: true,
  location: { protocol: 'https:', hostname: '192.168.1.50' },
  addEventListener: () => {},
  removeEventListener: () => {},
};

globalThis.document = {
  visibilityState: 'visible',
  addEventListener: () => {},
  removeEventListener: () => {},
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
  createElement: () => ({
    play: async () => {},
    pause: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    style: {},
    paused: false,
    parentNode: { removeChild: () => {} },
  }),
};

let mockWakeLock = {
  request: async (type) => ({
    type,
    released: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    release: async () => {},
  }),
};

Object.defineProperty(globalThis, 'navigator', {
  value: {
    get wakeLock() {
      return mockWakeLock;
    },
    set wakeLock(v) {
      mockWakeLock = v;
    }
  },
  configurable: true,
  writable: true,
});

const { wakeLockManager, WAKE_LOCK_STATES } = await import('../client/src/utils/wakeLock.js');

test('WakeLockManager - Constantes de estado estão definidas', () => {
  assert.equal(WAKE_LOCK_STATES.IDLE, 'idle');
  assert.equal(WAKE_LOCK_STATES.ACTIVE_NATIVE, 'active_native');
  assert.equal(WAKE_LOCK_STATES.ACTIVE_MEDIA, 'active_media');
  assert.equal(WAKE_LOCK_STATES.UNAVAILABLE_HTTP, 'unavailable_http');
  assert.equal(WAKE_LOCK_STATES.UNAVAILABLE_BROWSER, 'unavailable_browser');
  assert.equal(WAKE_LOCK_STATES.DENIED, 'denied');
  assert.equal(WAKE_LOCK_STATES.RELEASED, 'released');
  assert.equal(WAKE_LOCK_STATES.DISABLED, 'disabled');
});

test('WakeLockManager - Aquisição com sucesso via Screen Wake Lock API nativa', async () => {
  globalThis.window.isSecureContext = true;
  let releasedListener = null;

  mockWakeLock = {
    request: async (type) => ({
      type,
      released: false,
      addEventListener: (evt, cb) => {
        if (evt === 'release') releasedListener = cb;
      },
      removeEventListener: () => {},
      release: async () => {},
    }),
  };

  wakeLockManager.isContextSecure = true;
  wakeLockManager.isNativeSupported = true;
  wakeLockManager.userWantsActive = true;
  wakeLockManager.sentinel = null;

  const info = await wakeLockManager.requestWakeLock();

  assert.equal(info.state, WAKE_LOCK_STATES.ACTIVE_NATIVE);
  assert.equal(wakeLockManager.state, WAKE_LOCK_STATES.ACTIVE_NATIVE);
  assert.equal(info.isActive, true);
  assert.equal(info.isNative, true);
  assert.equal(info.isMedia, false);
});

test('WakeLockManager - Liberação pelo sistema operacional atualiza estado para RELEASED', async () => {
  let releaseCallback = null;

  mockWakeLock = {
    request: async (type) => {
      const sentinel = {
        type,
        released: false,
        addEventListener: (evt, cb) => {
          if (evt === 'release') releaseCallback = cb;
        },
        removeEventListener: () => {},
        release: async () => {},
      };
      return sentinel;
    },
  };

  wakeLockManager.isContextSecure = true;
  wakeLockManager.isNativeSupported = true;
  wakeLockManager.sentinel = null;
  await wakeLockManager.requestWakeLock();

  assert.equal(wakeLockManager.state, WAKE_LOCK_STATES.ACTIVE_NATIVE);

  // Simula o sistema operacional liberando a sentinela (ex: bloqueio de tela)
  assert.ok(releaseCallback, 'Listener de release deve ter sido registrado');
  releaseCallback();

  assert.equal(wakeLockManager.state, WAKE_LOCK_STATES.RELEASED);
  assert.equal(wakeLockManager.getStateInfo().isActive, false);
});

test('WakeLockManager - Detecta contexto inseguro HTTP e informa UNAVAILABLE_HTTP', async () => {
  wakeLockManager.sentinel = null;
  wakeLockManager.isContextSecure = false;
  wakeLockManager.isNativeSupported = true;
  wakeLockManager.allowMediaFallback = false;

  const info = await wakeLockManager.requestWakeLock(false);

  assert.equal(info.state, WAKE_LOCK_STATES.UNAVAILABLE_HTTP);
  assert.equal(wakeLockManager.state, WAKE_LOCK_STATES.UNAVAILABLE_HTTP);
  assert.equal(info.isActive, false);
  assert.match(info.detail, /HTTP/);
  assert.match(info.detail, /HTTPS/);
});

test('WakeLockManager - Fallback de micro-vídeo é ativado apenas quando habilitado', async () => {
  wakeLockManager.sentinel = null;
  wakeLockManager.isContextSecure = false;
  wakeLockManager.isNativeSupported = true;
  wakeLockManager.allowMediaFallback = true;
  wakeLockManager.videoElement = null;

  let playCalled = false;
  const mockVideo = {
    paused: false,
    play: async () => { playCalled = true; },
    pause: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    style: {},
    parentNode: { removeChild: () => {} },
  };
  globalThis.document.createElement = () => mockVideo;

  const info = await wakeLockManager.requestWakeLock(true);

  assert.equal(info.state, WAKE_LOCK_STATES.ACTIVE_MEDIA);
  assert.equal(playCalled, true);
  assert.equal(info.isActive, true);
  assert.equal(info.isMedia, true);
});

test('WakeLockManager - Desligamento pelo usuário (release) encerra sentinelas e bloqueia reativação', async () => {
  wakeLockManager.userWantsActive = true;
  let videoPaused = false;
  wakeLockManager.videoElement = {
    pause: () => { videoPaused = true; },
    removeAttribute: () => {},
    parentNode: { removeChild: () => {} },
  };

  wakeLockManager.release();

  assert.equal(wakeLockManager.userWantsActive, false);
  assert.equal(wakeLockManager.state, WAKE_LOCK_STATES.DISABLED);
  assert.equal(videoPaused, true);
});

test('WakeLockManager - NotAllowedError atualiza estado para DENIED', async () => {
  wakeLockManager.sentinel = null;
  wakeLockManager.userWantsActive = true;
  wakeLockManager.isContextSecure = true;
  wakeLockManager.isNativeSupported = true;
  wakeLockManager.allowMediaFallback = false;

  mockWakeLock = {
    request: async () => {
      const err = new Error('Permission denied');
      err.name = 'NotAllowedError';
      throw err;
    },
  };

  const info = await wakeLockManager.requestWakeLock(false);

  assert.equal(info.state, WAKE_LOCK_STATES.DENIED);
  assert.equal(wakeLockManager.state, WAKE_LOCK_STATES.DENIED);
  assert.match(info.detail, /NotAllowedError/);
});

test('WakeLockManager - Padrão Observer notifica subscribers', () => {
  let notifiedState = null;
  const unsubscribe = wakeLockManager.subscribe((info) => {
    notifiedState = info.state;
  });

  wakeLockManager.state = WAKE_LOCK_STATES.ACTIVE_NATIVE;
  wakeLockManager._notify();
  assert.equal(notifiedState, WAKE_LOCK_STATES.ACTIVE_NATIVE);

  unsubscribe();
  wakeLockManager.state = WAKE_LOCK_STATES.DISABLED;
  wakeLockManager._notify();
  // Não deve receber mais notificações após unsubscribe
  assert.equal(notifiedState, WAKE_LOCK_STATES.ACTIVE_NATIVE);
});

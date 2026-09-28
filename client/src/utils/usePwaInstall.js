import { useState, useEffect } from 'react';

/**
 * Hook para gerenciar instalação PWA (Progressive Web App).
 * Captura o evento beforeinstallprompt e permite instalar o TruckPilot Pro
 * como um aplicativo nativo no Windows, Android, iOS, tablet ou celular.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando em modo standalone (PWA instalado)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detecta iOS (onde o prompt é via menu de compartilhar do Safari)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice && !isStandalone);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('[PWA] TruckPilot Pro instalado com sucesso no dispositivo!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const isDesktop = !/android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
      return;
    }

    if (isIos) {
      alert("📲 Para instalar no iPhone / iPad:\n\n1. Toque no botão de Compartilhar (ícone com seta para cima no Safari)\n2. Role para baixo e selecione 'Adicionar à Tela de Início'\n3. Pronto! O app abrirá em tela cheia.");
      return;
    }

    if (!isLocalhost && isDesktop) {
      const targetUrl = `http://localhost:${window.location.port || '8000'}`;
      if (confirm(`💻 Para instalar como Aplicativo Oficial no Windows/Chrome:\n\nO Chrome exige que a instalação no PC seja feita pelo endereço localhost.\n\nDeseja abrir agora em ${targetUrl}?`)) {
        window.location.href = targetUrl;
      }
      return;
    }

    // Android ou Desktop no localhost
    alert("📱 Para instalar o TruckPilot Pro:\n\n1. Toque ou clique no menu de 3 pontinhos (⋮) do Google Chrome\n2. Selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'\n3. O TruckPilot Pro funcionará como um app nativo em tela cheia!");
  };

  return {
    isInstallable: !isInstalled,
    isInstalled,
    isIos,
    installApp,
  };
}

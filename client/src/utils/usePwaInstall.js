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

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      alert("Para instalar o TruckPilot Pro no seu iPhone ou iPad:\n1. Toque no botão de Compartilhar (ícone de quadrado com seta para cima no Safari)\n2. Role para baixo e selecione 'Adicionar à Tela de Início'.");
    }
  };

  return {
    isInstallable: isInstallable || isIos,
    isInstalled,
    isIos,
    installApp,
  };
}

import { useState, useEffect, useRef } from 'react';
import { ETS2_SPEED_CAMERAS } from '../data/ets2_pois';

/**
 * Hook compartilhado para detecção de radares de velocidade à frente em tempo real.
 * Funciona tanto na visualização do Painel quanto no GPS.
 */
export function useRadarWarning(placement, voiceEnabled = true) {
  const [approachingRadar, setApproachingRadar] = useState(null);
  const lastRadarAlertIdRef = useRef('');
  const lastRadarAlertTimeRef = useRef(0);

  const posX = placement?.x;
  const posZ = placement?.z;

  useEffect(() => {
    if (!posX && !posZ) {
      setApproachingRadar(null);
      return;
    }
    if (posX === 0 && posZ === 0) {
      setApproachingRadar(null);
      return;
    }

    let nearestRadar = null;
    let minDistance = Infinity;

    for (const cam of ETS2_SPEED_CAMERAS) {
      const dx = cam.x - posX;
      const dz = cam.z - posZ;
      const distMeters = Math.hypot(dx, dz);

      if (distMeters < minDistance) {
        minDistance = distMeters;
        nearestRadar = { ...cam, distance: Math.round(distMeters) };
      }
    }

    if (nearestRadar && minDistance <= 650) {
      setApproachingRadar(nearestRadar);

      const now = Date.now();
      if (nearestRadar.id !== lastRadarAlertIdRef.current || (now - lastRadarAlertTimeRef.current > 18000)) {
        lastRadarAlertIdRef.current = nearestRadar.id;
        lastRadarAlertTimeRef.current = now;
        
        if (voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
          try {
            window.speechSynthesis.cancel();
            const text = `Atenção: radar de velocidade à frente a ${nearestRadar.distance} metros. Limite de ${nearestRadar.limit} quilômetros por hora.`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = 1.05;
            const voices = window.speechSynthesis.getVoices();
            const brVoice = voices.find(v => v.lang === 'pt-BR' || v.lang.startsWith('pt'));
            if (brVoice) utterance.voice = brVoice;
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('Erro na síntese de voz do radar:', e);
          }
        }
      }
    } else {
      setApproachingRadar(null);
    }
  }, [posX, posZ, voiceEnabled]);

  return approachingRadar;
}

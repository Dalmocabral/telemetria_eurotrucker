"""
Módulo de envio de teclas para o Euro Truck Simulator 2 via PyDirectInput.
PyDirectInput envia Scan Codes reais para o hook de DirectInput do DirectX,
garantindo que o ETS2 reconheça as teclas mesmo em modo exclusivo ou tela cheia.
"""

import time
import threading
import pydirectinput

# Configurações do PyDirectInput para jogos em tempo real
pydirectinput.PAUSE = 0.01
pydirectinput.FAILSAFE = False

def trigger_action(action_name: str) -> bool:
    """Executa a ação correspondente no ETS2 em uma thread separada."""
    action = action_name.lower().strip()
    
    def _run():
        try:
            if action == "engine":
                # ETS2 exige segurar a tecla E por cerca de 350ms para ligar a partida do motor
                pydirectinput.keyDown('e')
                time.sleep(0.35)
                pydirectinput.keyUp('e')
            elif action == "light":
                # Alternar faróis (Tecla L)
                pydirectinput.keyDown('l')
                time.sleep(0.08)
                pydirectinput.keyUp('l')
            elif action == "highbeam":
                # Farol Alto (Tecla K)
                pydirectinput.keyDown('k')
                time.sleep(0.08)
                pydirectinput.keyUp('k')
            elif action == "hazard":
                # Pisca-Alerta (Tecla F)
                pydirectinput.keyDown('f')
                time.sleep(0.08)
                pydirectinput.keyUp('f')
            elif action == "handbrake":
                # Freio de Estacionamento (Tecla Espaço)
                pydirectinput.keyDown('space')
                time.sleep(0.1)
                pydirectinput.keyUp('space')
            elif action == "cruise":
                # Piloto Automático / Cruise Control (Tecla C)
                pydirectinput.keyDown('c')
                time.sleep(0.08)
                pydirectinput.keyUp('c')
            elif action == "wipers":
                # Limpadores de Para-brisa (Tecla P)
                pydirectinput.keyDown('p')
                time.sleep(0.08)
                pydirectinput.keyUp('p')
            else:
                print(f"[KeySender] Ação desconhecida: {action}")
                return

            print(f"[KeySender] Tecla executada com sucesso no ETS2: {action}")
        except Exception as e:
            print(f"[KeySender] Erro ao disparar tecla '{action}': {e}")

    threading.Thread(target=_run, daemon=True).start()
    return True

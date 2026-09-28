"""
Módulo de Auto-Pilot Inteligente para o Euro Truck Simulator 2.
Trabalha em conjunto com o Cruise Control (Tecla C) e as placas de velocidade (Speed Limit).
Quando ambos estão ativos (Cruise + Auto-Pilot):
- Se o limite da via diminui (ex: 100 -> 80 km/h), desacelera suavemente até a nova placa e reengata o Cruise.
- Se o limite da via aumenta (ex: 80 -> 110 km/h), acelera até a nova placa e reengata o Cruise.
"""

import time
import threading
import pydirectinput
from typing import Optional

pydirectinput.PAUSE = 0.01
pydirectinput.FAILSAFE = False


class AutoPilotManager:
    def __init__(self):
        self.is_enabled = False
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._reader = None
        self._last_target_speed = 0
        self._is_adjusting = False

    def init_with_reader(self, reader):
        self._reader = reader
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._control_loop, daemon=True)
            self._thread.start()

    def toggle(self) -> bool:
        self.is_enabled = not self.is_enabled
        print(f"[AutoPilot] Estado alterado: {'ATIVADO' if self.is_enabled else 'DESATIVADO'}")
        return self.is_enabled

    def set_enabled(self, enabled: bool):
        self.is_enabled = enabled
        print(f"[AutoPilot] Definido para: {'ATIVADO' if self.is_enabled else 'DESATIVADO'}")

    def _control_loop(self):
        while self._running:
            try:
                time.sleep(0.25)
                if not self.is_enabled or not self._reader:
                    continue

                data = self._reader.get_data()
                truck = data.get("truck", {})
                speed = truck.get("speed", 0.0)
                speed_limit = truck.get("speedLimit", 0.0)
                cruise_on = truck.get("cruiseControl", False)
                rpm = truck.get("rpm", 0.0)
                engine_on = bool(truck.get("engineOn", False) or rpm > 350 or not data.get("connected", True))

                # Se o motor estiver desligado com o caminhão parado, apenas aguarda sem desativar a escolha do usuário
                if not engine_on and speed < 2.0:
                    continue

                # Se puxar o freio de mão em movimento (acima de 10 km/h), desativa por segurança
                if park_brake and speed > 10.0:
                    if self.is_enabled:
                        self.is_enabled = False
                        print("[AutoPilot] Desativado automaticamente por segurança (Freio de mão acionado em movimento).")
                    continue

                # O Auto-Pilot gerencia velocidade quando o Cruise Control estiver ligado
                if not cruise_on:
                    continue

                # Apenas atua se a via tiver um limite válido de velocidade (mínimo 30 km/h)
                if speed_limit < 30.0:
                    continue

                # Caso 1: Caminhão acima do limite da placa (ex: estava a 100 km/h e a placa mudou para 80 km/h)
                if speed > (speed_limit + 3.0) and not self._is_adjusting:
                    self._is_adjusting = True
                    print(f"[AutoPilot] Reduzindo velocidade para o limite da via: {speed_limit} km/h (atual: {speed:.1f})")
                    
                    # Desengata o cruise para permitir desaceleração
                    pydirectinput.keyDown('c')
                    time.sleep(0.06)
                    pydirectinput.keyUp('c')
                    time.sleep(0.1)

                    # Pulso suave de freio até chegar no limite
                    start_brake = time.time()
                    while self.is_enabled and (time.time() - start_brake < 4.0):
                        cur_data = self._reader.get_data()
                        cur_speed = cur_data.get("truck", {}).get("speed", 0.0)
                        if cur_speed <= (speed_limit + 1.0):
                            break
                        pydirectinput.keyDown('s')
                        time.sleep(0.12)
                        pydirectinput.keyUp('s')
                        time.sleep(0.08)

                    # Reengata o cruise control na nova velocidade da placa
                    pydirectinput.keyDown('c')
                    time.sleep(0.08)
                    pydirectinput.keyUp('c')
                    self._is_adjusting = False
                    self._last_target_speed = speed_limit
                    time.sleep(1.0)

                # Caso 2: Caminhão abaixo do limite da placa (ex: limite subiu de 80 para 110 km/h)
                elif speed < (speed_limit - 4.0) and not self._is_adjusting:
                    self._is_adjusting = True
                    print(f"[AutoPilot] Acelerando para novo limite da via: {speed_limit} km/h (atual: {speed:.1f})")

                    start_accel = time.time()
                    while self.is_enabled and (time.time() - start_accel < 8.0):
                        cur_data = self._reader.get_data()
                        cur_speed = cur_data.get("truck", {}).get("speed", 0.0)
                        if cur_speed >= (speed_limit - 1.0):
                            break
                        pydirectinput.keyDown('w')
                        time.sleep(0.25)
                        pydirectinput.keyUp('w')
                        time.sleep(0.05)

                    # Fixa o cruise control no novo limite
                    pydirectinput.keyDown('c')
                    time.sleep(0.08)
                    pydirectinput.keyUp('c')
                    self._is_adjusting = False
                    self._last_target_speed = speed_limit
                    time.sleep(1.0)

            except Exception as e:
                self._is_adjusting = False
                time.sleep(0.5)


autopilot_manager = AutoPilotManager()

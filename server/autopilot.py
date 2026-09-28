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
        self._last_toggle_time = 0.0
        self._pending_limit = None
        self._pending_limit_start = 0.0

    def init_with_reader(self, reader):
        self._reader = reader
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._control_loop, daemon=True)
            self._thread.start()

    def toggle(self) -> bool:
        now = time.time()
        # Debounce de 400ms para impedir duplo clique involuntário
        if now - self._last_toggle_time < 0.4:
            return self.is_enabled
        self._last_toggle_time = now
        self.is_enabled = not self.is_enabled
        if not self.is_enabled:
            self._is_adjusting = False
            self._pending_limit = None
            try:
                pydirectinput.keyUp('w')
                pydirectinput.keyUp('s')
            except Exception:
                pass
        print(f"[AutoPilot] Estado alterado: {'ATIVADO' if self.is_enabled else 'DESATIVADO'}")
        return self.is_enabled

    def set_enabled(self, enabled: bool):
        self.is_enabled = enabled
        if not self.is_enabled:
            self._is_adjusting = False
            self._pending_limit = None
            try:
                pydirectinput.keyUp('w')
                pydirectinput.keyUp('s')
            except Exception:
                pass
        print(f"[AutoPilot] Definido para: {'ATIVADO' if self.is_enabled else 'DESATIVADO'}")

    def _control_loop(self):
        while self._running:
            try:
                time.sleep(0.25)
                if not self.is_enabled or not self._reader:
                    self._pending_limit = None
                    continue

                data = self._reader.get_data()
                truck = data.get("truck", {})
                speed = truck.get("speed", 0.0)
                speed_limit = truck.get("speedLimit", 0.0)
                cruise_on = truck.get("cruiseControl", False)
                rpm = truck.get("rpm", 0.0)
                engine_on = bool(truck.get("engineOn", False) or rpm > 350 or not data.get("connected", True))
                park_brake = truck.get("parkBrake", False)

                # Se motor estiver desligado com caminhão parado, apenas aguarda sem desativar a escolha
                if not engine_on and speed < 2.0:
                    continue

                # Se puxar o freio de mão em movimento real (acima de 10 km/h), desativa por segurança
                if park_brake and speed > 10.0:
                    if self.is_enabled:
                        self.is_enabled = False
                        self._is_adjusting = False
                        print("[AutoPilot] Desativado automaticamente por segurança (Freio de mão em movimento).")
                    continue

                # O Auto-Pilot SOMENTE atua se o motorista estiver com o Cruise Control ligado no caminhão!
                if not cruise_on:
                    self._pending_limit = None
                    self._is_adjusting = False
                    continue

                # Apenas atua se a via tiver um limite válido de velocidade
                if speed_limit < 40.0:
                    continue

                # FILTRO DE ESTABILIDADE: No ETS2, viadutos, trevos e saídas mudam a placa para 50 km/h por 1 ou 2 segundos.
                # O AutoPilot exige que a nova placa permaneça estável por pelo menos 2.5 segundos para não frear sem motivo.
                now = time.time()
                if speed_limit != self._last_target_speed:
                    if self._pending_limit != speed_limit:
                        self._pending_limit = speed_limit
                        self._pending_limit_start = now
                        continue
                    elif now - self._pending_limit_start < 2.5:
                        continue

                # Caso 1: Caminhão acima do limite da placa (ex: estava a 90 e a placa caiu para 80)
                if speed > (speed_limit + 4.0) and not self._is_adjusting:
                    self._is_adjusting = True
                    print(f"[AutoPilot] Reduzindo suavemente para limite da via: {speed_limit} km/h (atual: {speed:.1f})")
                    
                    # Desengata o cruise para desaceleração natural
                    pydirectinput.keyDown('c')
                    time.sleep(0.06)
                    pydirectinput.keyUp('c')
                    time.sleep(0.15)

                    # Pulso leve de freio até chegar próximo ao limite
                    start_brake = time.time()
                    while self.is_enabled and (time.time() - start_brake < 3.5):
                        cur_data = self._reader.get_data()
                        cur_speed = cur_data.get("truck", {}).get("speed", 0.0)
                        if cur_speed <= (speed_limit + 1.5):
                            break
                        pydirectinput.keyDown('s')
                        time.sleep(0.08)
                        pydirectinput.keyUp('s')
                        time.sleep(0.12)

                    if self.is_enabled:
                        # Reengata o cruise na nova velocidade
                        pydirectinput.keyDown('c')
                        time.sleep(0.08)
                        pydirectinput.keyUp('c')
                    self._is_adjusting = False
                    self._last_target_speed = speed_limit
                    time.sleep(1.0)

                # Caso 2: Limite da via subiu (ex: de 60 para 80 km/h)
                elif speed < (speed_limit - 5.0) and not self._is_adjusting:
                    self._is_adjusting = True
                    print(f"[AutoPilot] Acelerando para novo limite da via: {speed_limit} km/h (atual: {speed:.1f})")

                    start_accel = time.time()
                    while self.is_enabled and (time.time() - start_accel < 7.0):
                        cur_data = self._reader.get_data()
                        cur_speed = cur_data.get("truck", {}).get("speed", 0.0)
                        if cur_speed >= (speed_limit - 1.5):
                            break
                        pydirectinput.keyDown('w')
                        time.sleep(0.2)
                        pydirectinput.keyUp('w')
                        time.sleep(0.06)

                    if self.is_enabled:
                        pydirectinput.keyDown('c')
                        time.sleep(0.08)
                        pydirectinput.keyUp('c')
                    self._is_adjusting = False
                    self._last_target_speed = speed_limit
                    time.sleep(1.0)

            except Exception as e:
                self._is_adjusting = False
                try:
                    pydirectinput.keyUp('w')
                    pydirectinput.keyUp('s')
                except Exception:
                    pass
                time.sleep(0.5)


autopilot_manager = AutoPilotManager()

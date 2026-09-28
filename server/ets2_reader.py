"""
Leitor de Telemetria do Euro Truck Simulator 2 (ETS2).
Suporta leitura direta da Memória Compartilhada do Windows (SCS Telemetry Plugin)
com compatibilidade automática para:
- Local\\TSGPSTelemetry (TruckSim GPS / CocoaSandwich)
- Local\\ets2simDashboardTelemetryV2 (SIM Dashboard)
- Local\\SCSTelemetry (SCS SDK Plugin oficial)
- Local\\SimTelemetryETS2 (Funbit Telemetry Server)
E inclui um Modo Demonstração realista automático caso o jogo esteja fechado.
"""

import math
import mmap
import time
from typing import Dict, Any, Optional

import truck_telemetry.telemetry_version.v1_10 as v1_10
import truck_telemetry.telemetry_version.v1_12 as v1_12
from truckersmp_bridge import truckersmp_bridge_instance


# Lista ordenada de mapeamentos de memória compartilhada para testar
SHARED_MEMORY_NAMES = [
    r"Local\ets2simDashboardTelemetryV2",
    r"Local\SCSTelemetry",
    r"Local\SimTelemetryETS2",
    r"Local\SCS/Telemetry/ETS2",
    r"Local\TSGPSTelemetry",
    "ets2simDashboardTelemetryV2",
    "SCSTelemetry",
    "TSGPSTelemetry",
]

class ETS2Reader:
    def __init__(self):
        self.is_connected = False
        self.mmap_obj: Optional[mmap.mmap] = None
        self.parser_version = None
        self.connected_name = None
        
        # Histórico da última posição válida para manter a câmera suave no mapa ao desconectar
        self._last_known_x = -21700.68
        self._last_known_z = -5700.77
        self._last_known_heading = 0.0
        self._last_connect_try = 0.0

    def try_connect_shared_memory(self) -> bool:
        """Tenta abrir os blocos de memória compartilhada criados pelos plugins do ETS2."""
        now = time.time()
        # Não tenta mais de 1x a cada 1.0 segundo para não consumir CPU
        if now - self._last_connect_try < 1.0:
            return self.is_connected
        self._last_connect_try = now

        for name in SHARED_MEMORY_NAMES:
            try:
                shm = mmap.mmap(-1, 32768, name, access=mmap.ACCESS_READ)
                b = memoryview(shm)
                
                # Ignora blocos vazios ou desativados (todos zeros nos primeiros 64 bytes)
                if all(x == 0 for x in b[:64]):
                    shm.close()
                    continue

                parser = None
                # Testa se é v1.12 ou v1.10
                if v1_12.is_same_version(b):
                    parser = v1_12
                elif v1_10.is_same_version(b):
                    parser = v1_10
                else:
                    # Verifica se o parser v1.10 ou v1.12 consegue extrair dados válidos
                    try:
                        t10 = v1_10.parse_data(b)
                        if t10.get("time_abs", 0) > 0 or t10.get("engineRpm", 0) > 0 or t10.get("coordinateX", 0) != 0:
                            parser = v1_10
                    except Exception:
                        pass
                    if not parser:
                        try:
                            t12 = v1_12.parse_data(b)
                            if t12.get("time_abs", 0) > 0 or t12.get("engineRpm", 0) > 0 or t12.get("coordinateX", 0) != 0:
                                parser = v1_12
                        except Exception:
                            pass

                if not parser:
                    shm.close()
                    continue

                self.mmap_obj = shm
                self.parser_version = parser
                self.is_connected = True
                self.connected_name = name
                print(f"[ETS2Reader] Conectado com sucesso na memória: {name} (versão: {parser.__name__})!")
                return True
            except Exception:
                continue

        self.is_connected = False
        self.mmap_obj = None
        self.parser_version = None
        return False

    def get_data(self) -> Dict[str, Any]:
        """
        Retorna o dicionário de telemetria formatado.
        Lê dados reais se o jogo estiver conectado; senão, entrega estado real desconectado.
        """
        if not self.is_connected or not self.mmap_obj:
            self.try_connect_shared_memory()

        if self.is_connected and self.mmap_obj and self.parser_version:
            try:
                self.mmap_obj.seek(0)
                b = memoryview(self.mmap_obj)
                if all(x == 0 for x in b[:32]):
                    raise RuntimeError("Memória zerada pelo jogo.")
                raw = self.parser_version.parse_data(b)
                return self._format_real_data(raw)
            except Exception as e:
                # Se falhar (ex: jogo fechou), reseta e volta ao fallback desconectado
                print(f"[ETS2Reader] Conexão com jogo encerrada: {e}")
                self.is_connected = False
                try:
                    self.mmap_obj.close()
                except Exception:
                    pass
                self.mmap_obj = None
                self.parser_version = None

        return self._get_disconnected_data()

    def _format_real_data(self, d: Dict[str, Any]) -> Dict[str, Any]:
        """Formata os dados brutos lidos da memória do ETS2 para o padrão esperado pelo frontend."""
        # Velocidade em km/h (o jogo fornece em m/s)
        speed_raw = d.get("speed", 0.0) or 0.0
        speed_kmh = max(0.0, round(speed_raw * 3.6, 1))
        
        # Limite de velocidade da via em km/h
        speed_limit_raw = d.get("speedLimit", 0.0) or 0.0
        speed_limit_kmh = round(speed_limit_raw * 3.6)
        if speed_limit_kmh <= 0:
            speed_limit_kmh = 80

        # RPM
        rpm = int(d.get("engineRpm", 0.0) or 0)
        max_rpm = int(d.get("engineRpmMax", 2500) or 2500)

        # Marchas
        gear = int(d.get("gear", 0) or 0)
        gear_dash = d.get("gearDashboard")
        if gear_dash is None or gear_dash == 0:
            if gear > 0:
                displayed_gear = f"D{gear}"
            elif gear < 0:
                displayed_gear = f"R{abs(gear)}"
            else:
                displayed_gear = "N"
        else:
            displayed_gear = f"D{gear_dash}" if gear_dash > 0 else ("N" if gear_dash == 0 else f"R{abs(gear_dash)}")

        suggested_gear = min(12, max(1, gear + 1 if rpm > 1750 else (gear - 1 if rpm < 1000 and gear > 1 else gear)))

        # Combustível
        fuel = round(d.get("fuel", 0.0) or 0.0, 1)
        fuel_cap = round(d.get("fuelCapacity", 600.0) or 600.0, 1)
        fuel_avg = round(d.get("fuelAvgConsumption", 30.0) or 30.0, 1)

        # Posição e Rotação
        coord_x = round(d.get("coordinateX", 0.0) or 0.0, 2)
        coord_y = round(d.get("coordinateY", 0.0) or 0.0, 2)
        coord_z = round(d.get("coordinateZ", 0.0) or 0.0, 2)
        
        # No SCS SDK: rotationX é a orientação (heading/yaw) do caminhão em frações de volta (turns)
        rot_val = float(d.get("rotationX", 0.0) or d.get("rotationY", 0.0) or 0.0)
        heading_deg = round((-rot_val * 360.0) % 360.0, 1)
        if heading_deg < 0:
            heading_deg += 360.0


        # Distância restante até a entrega (o jogo entrega em metros)
        route_dist_m = d.get("routeDistance", 0.0) or 0.0
        route_dist_km = max(0, int(route_dist_m / 1000.0))
        
        # Tempo restante (em segundos)
        route_time_s = d.get("routeTime", 0.0) or 0.0
        hours = int(route_time_s // 3600)
        minutes = int((route_time_s % 3600) // 60)
        eta_str = f"{hours}h {minutes:02d}m" if route_time_s > 0 else "--:--"

        # Luzes
        blinker_l = bool(d.get("blinkerLeftOn", False) or d.get("blinkerLeftActive", False))
        blinker_r = bool(d.get("blinkerRightOn", False) or d.get("blinkerRightActive", False))
        beam_low = bool(d.get("lightsBeamLow", False))
        beam_high = bool(d.get("lightsBeamHigh", False))
        park_lights = bool(d.get("lightsParking", False))

        if coord_x != 0.0 or coord_z != 0.0:
            self._last_known_x = coord_x
            self._last_known_z = coord_z
            self._last_known_heading = heading_deg

        on_job = bool(d.get("onJob", False))
        city_src = str(d.get("citySrc", "") or "") if on_job else ""
        city_src_id = str(d.get("citySrcId", "") or "") if on_job else ""
        city_dst = str(d.get("cityDst", "") or "") if on_job else ""
        city_dst_id = str(d.get("cityDstId", "") or "") if on_job else ""
        comp_src = str(d.get("compSrc", "") or "") if on_job else ""
        comp_src_id = str(d.get("compSrcId", "") or "") if on_job else ""
        comp_dst = str(d.get("compDst", "") or "") if on_job else ""
        comp_dst_id = str(d.get("compDstId", "") or "") if on_job else ""
        cargo_name = str(d.get("cargo", "Sem Carga") or "Sem Carga") if on_job else "Sem Carga"

        return {
            "connected": True,
            "simulated": False,
            "game": {
                "paused": bool(d.get("paused", False)),
                "time": str(d.get("time", "12:00")),
                "gameVersion": f"{d.get('version_major', 1)}.{d.get('version_minor', 50)}",
            },
            "truck": {
                "speed": speed_kmh,
                "speedLimit": speed_limit_kmh,
                "rpm": rpm,
                "maxRpm": max_rpm,
                "gear": gear,
                "displayedGear": displayed_gear,
                "suggestedGear": suggested_gear,
                "fuel": fuel,
                "fuelCapacity": fuel_cap,
                "fuelAverageConsumption": fuel_avg,
                "fuelWarning": bool(d.get("fuelWarning", False) or (fuel_cap > 0 and fuel / fuel_cap < 0.15)),
                "waterTemperature": round(d.get("waterTemperature", 85.0) or 85.0, 1),
                "oilTemperature": round(d.get("oilTemperature", 90.0) or 90.0, 1),
                "brakeAirPressure": round(d.get("airPressure", 8.0) or 8.0, 1),
                "batteryVoltage": round(d.get("batteryVoltage", 24.0) or 24.0, 1),
                "retarderLevel": int(d.get("retarderStepCount", 0) or d.get("retarderBrake", 0) or 0),
                "parkBrake": bool(d.get("parkBrake", False)),
                "motorBrake": bool(d.get("motorBrake", False)),
                "cruiseControl": bool(d.get("cruiseControl", False)),
                "cruiseControlSpeed": round((d.get("cruiseControlSpeed", 0.0) or 0.0) * 3.6),
                "odometer": round(d.get("truckOdometer", 0.0) or 0.0, 1),
                "wearEngine": round(d.get("wearEngine", 0.0) or 0.0, 2),
                "wearTransmission": round(d.get("wearTransmission", 0.0) or 0.0, 2),
                "wearCabin": round(d.get("wearCabin", 0.0) or 0.0, 2),
                "wearChassis": round(d.get("wearChassis", 0.0) or 0.0, 2),
                "wearWheels": round(d.get("wearWheels", 0.0) or 0.0, 2),
            },
            "lights": {
                "blinkerLeft": blinker_l,
                "blinkerRight": blinker_r,
                "beamLow": beam_low,
                "beamHigh": beam_high,
                "parkingLights": park_lights,
                "beacon": bool(d.get("lightsBeacon", False)),
                "brakeLights": bool(d.get("lightsBrake", False)),
                "reverseLights": bool(d.get("lightsReverse", False)),
            },
            "job": {
                "cargo": cargo_name,
                "cargoWeight": round(d.get("cargoMass", 0.0) or 0.0) if on_job else 0,
                "cargoDamage": round(d.get("cargoDamage", 0.0) or 0.0, 2) if on_job else 0.0,
                "citySource": city_src,
                "citySourceId": city_src_id,
                "cityDestination": city_dst,
                "cityDestinationId": city_dst_id,
                "cityDst": city_dst,
                "cityDstId": city_dst_id,
                "companySource": comp_src,
                "companySourceId": comp_src_id,
                "companyDestination": comp_dst,
                "companyDestinationId": comp_dst_id,
                "compDst": comp_dst,
                "compDstId": comp_dst_id,
                "income": int(d.get("jobIncome", 0) or 0) if on_job else 0,
                "deadline": "Em andamento" if on_job else "--",
                "onJob": on_job,
                "isCargoLoaded": bool(d.get("isCargoLoaded", False)),
                "trailerAttached": bool(isinstance(d.get("trailer"), list) and len(d.get("trailer")) > 0 and isinstance(d.get("trailer")[0], dict) and d.get("trailer")[0].get("attached", False)),
            },
            "navigation": {
                "distance": route_dist_km,
                "distanceMeters": int(route_dist_m),
                "time": eta_str,
                "nextRestStop": "6h 00m",
            },
            "placement": {
                "x": coord_x,
                "y": coord_y,
                "z": coord_z,
                "heading": heading_deg,
            },
            "multiplayer": truckersmp_bridge_instance.get_telemetry_payload(
                coord_x, coord_z, heading_deg, enable_simulation=False
            ),
        }

    def _get_disconnected_data(self) -> Dict[str, Any]:
        """
        Retorna o estado seguro e limpo quando o Euro Truck Simulator 2 estiver fechado.
        Não gera dados simulados ou falsos, mantendo o painel com leitura real de jogo desconectado.
        """
        px = getattr(self, "_last_known_x", -21700.68)
        pz = getattr(self, "_last_known_z", -5700.77)
        pheading = getattr(self, "_last_known_heading", 0.0)

        return {
            "connected": False,
            "simulated": False,
            "game": {
                "paused": True,
                "time": "--:--",
                "gameVersion": "1.50+",
            },
            "truck": {
                "speed": 0.0,
                "speedLimit": 80,
                "rpm": 0,
                "maxRpm": 2500,
                "gear": 0,
                "displayedGear": "N",
                "suggestedGear": 1,
                "fuel": 0.0,
                "fuelCapacity": 1200.0,
                "fuelAverageConsumption": 30.0,
                "fuelWarning": False,
                "waterTemperature": 0.0,
                "oilTemperature": 0.0,
                "brakeAirPressure": 8.0,
                "batteryVoltage": 24.0,
                "retarderLevel": 0,
                "parkBrake": True,
                "motorBrake": False,
                "cruiseControl": False,
                "cruiseControlSpeed": 0,
                "odometer": 0.0,
                "wearEngine": 0.0,
                "wearTransmission": 0.0,
                "wearCabin": 0.0,
                "wearChassis": 0.0,
                "wearWheels": 0.0,
            },
            "lights": {
                "blinkerLeft": False,
                "blinkerRight": False,
                "beamLow": False,
                "beamHigh": False,
                "parkingLights": False,
                "beacon": False,
                "brakeLights": False,
                "reverseLights": False,
            },
            "job": {
                "cargo": "Aguardando ETS2...",
                "cargoWeight": 0,
                "cargoDamage": 0.0,
                "citySource": "",
                "citySourceId": "",
                "cityDestination": "",
                "cityDestinationId": "",
                "cityDst": "",
                "cityDstId": "",
                "companySource": "",
                "companySourceId": "",
                "companyDestination": "",
                "companyDestinationId": "",
                "compDst": "",
                "compDstId": "",
                "income": 0,
                "deadline": "--",
                "onJob": False,
                "isCargoLoaded": False,
                "trailerAttached": False,
            },
            "navigation": {
                "distance": 0,
                "distanceMeters": 0,
                "time": "--:--",
                "nextRestStop": "--:--",
            },
            "placement": {
                "x": px,
                "y": 0.0,
                "z": pz,
                "heading": pheading,
            },
            "multiplayer": {
                "connected": False,
                "player_count": 0,
                "players": [],
            },
        }

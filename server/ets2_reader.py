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
        
        # Variáveis internas para o Modo Demonstração
        self._sim_time = 0.0
        self._sim_speed = 0.0
        self._sim_heading = 0.0
        self._sim_x = -28842.0
        self._sim_z = 4982.0
        self._sim_fuel = 1090.0
        self._sim_blinker_left = False
        self._sim_blinker_right = False
        self._sim_cruise = False
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
        Lê dados reais se o jogo estiver conectado; senão, entrega simulação de teste.
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
                # Se falhar (ex: jogo fechou), reseta e volta ao fallback
                print(f"[ETS2Reader] Conexão com jogo encerrada: {e}")
                self.is_connected = False
                try:
                    self.mmap_obj.close()
                except Exception:
                    pass
                self.mmap_obj = None
                self.parser_version = None

        return self._generate_simulated_data()

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
                "cargo": str(d.get("cargo", "Sem Carga") or "Sem Carga"),
                "cargoWeight": round(d.get("cargoMass", 0.0) or 0.0),
                "cargoDamage": round(d.get("cargoDamage", 0.0) or 0.0, 2),
                "citySource": str(d.get("citySrc", "Origem") or "Origem"),
                "citySourceId": str(d.get("citySrcId", "") or ""),
                "cityDestination": str(d.get("cityDst", "Destino") or "Destino"),
                "cityDestinationId": str(d.get("cityDstId", "") or ""),
                "cityDst": str(d.get("cityDst", "Destino") or "Destino"),
                "cityDstId": str(d.get("cityDstId", "") or ""),
                "companySource": str(d.get("compSrc", "") or ""),
                "companySourceId": str(d.get("compSrcId", "") or ""),
                "companyDestination": str(d.get("compDst", "") or ""),
                "companyDestinationId": str(d.get("compDstId", "") or ""),
                "compDst": str(d.get("compDst", "") or ""),
                "compDstId": str(d.get("compDstId", "") or ""),
                "income": int(d.get("jobIncome", 0) or 0),
                "deadline": "Em andamento",
                "onJob": bool(d.get("onJob", False)),
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
            }
        }

    def _generate_simulated_data(self) -> Dict[str, Any]:
        """Gera dados realistas de demonstração caso o jogo esteja fechado."""
        self._sim_time += 0.05
        t = self._sim_time

        cycle = (t % 60)
        if cycle < 25:
            target_speed = 85.0 * (cycle / 25)
            self._sim_cruise = False
        elif cycle < 45:
            target_speed = 85.0 + math.sin(t * 0.5) * 1.5
            self._sim_cruise = True
        elif cycle < 55:
            target_speed = 35.0
            self._sim_cruise = False
        else:
            target_speed = 60.0
            self._sim_cruise = False

        self._sim_speed += (target_speed - self._sim_speed) * 0.04
        kmh = max(0.0, self._sim_speed)

        if kmh < 5:
            gear = 1
            rpm = 750 + (kmh / 5.0) * 800
        elif kmh < 15:
            gear = 3
            rpm = 1000 + ((kmh - 5) / 10.0) * 1000
        elif kmh < 30:
            gear = 5
            rpm = 1100 + ((kmh - 15) / 15.0) * 1000
        elif kmh < 50:
            gear = 7
            rpm = 1100 + ((kmh - 30) / 20.0) * 900
        elif kmh < 70:
            gear = 10
            rpm = 1150 + ((kmh - 50) / 20.0) * 800
        else:
            gear = 12
            rpm = 1100 + ((kmh - 70) / 25.0) * 550

        rpm += math.sin(t * 4) * 15
        speed_ms = (kmh / 3.6)
        self._sim_heading += math.sin(t * 0.2) * 0.015
        self._sim_x += math.cos(self._sim_heading) * speed_ms * 0.05 * 10
        self._sim_z += math.sin(self._sim_heading) * speed_ms * 0.05 * 10

        if math.sin(t * 0.2) > 0.6:
            self._sim_blinker_right = (int(t * 2.5) % 2 == 0)
            self._sim_blinker_left = False
        elif math.sin(t * 0.2) < -0.6:
            self._sim_blinker_left = (int(t * 2.5) % 2 == 0)
            self._sim_blinker_right = False
        else:
            self._sim_blinker_left = False
            self._sim_blinker_right = False

        self._sim_fuel = max(10.0, 1090.0 - (t * 0.005))
        heading_deg = math.degrees(self._sim_heading) % 360

        return {
            "connected": False,
            "simulated": True,
            "game": {
                "paused": False,
                "time": "14:32",
                "gameVersion": "1.50+",
            },
            "truck": {
                "speed": round(kmh, 1),
                "speedLimit": 80,
                "rpm": int(rpm),
                "maxRpm": 2500,
                "gear": gear,
                "displayedGear": f"D{gear}" if gear > 0 else ("N" if gear == 0 else f"R{abs(gear)}"),
                "suggestedGear": min(12, gear + 1) if rpm > 1700 else (max(1, gear - 1) if rpm < 1000 and gear > 1 else gear),
                "fuel": round(self._sim_fuel, 1),
                "fuelCapacity": 1200,
                "fuelAverageConsumption": 29.4,
                "fuelWarning": False,
                "waterTemperature": 88.5,
                "oilTemperature": 92.0,
                "brakeAirPressure": 8.2,
                "batteryVoltage": 24.2,
                "retarderLevel": 1 if (cycle >= 45 and cycle < 55) else 0,
                "parkBrake": False,
                "motorBrake": False,
                "cruiseControl": self._sim_cruise,
                "cruiseControlSpeed": 85 if self._sim_cruise else 0,
                "odometer": round(142580 + (t * 0.02), 1),
                "wearEngine": 0.02,
                "wearTransmission": 0.01,
                "wearCabin": 0.00,
                "wearChassis": 0.01,
                "wearWheels": 0.04,
            },
            "lights": {
                "blinkerLeft": self._sim_blinker_left,
                "blinkerRight": self._sim_blinker_right,
                "beamLow": True,
                "beamHigh": False,
                "parkingLights": True,
                "beacon": False,
                "brakeLights": (cycle >= 45 and cycle < 55),
                "reverseLights": False,
            },
            "job": {
                "cargo": "Carga de Teste (Simulação)",
                "cargoWeight": 18500,
                "cargoDamage": 0.0,
                "citySource": "Paris",
                "citySourceId": "paris",
                "cityDestination": "Lille",
                "cityDestinationId": "lille",
                "cityDst": "Lille",
                "cityDstId": "lille",
                "companySource": "EuroGoodies",
                "companySourceId": "eurogoodies",
                "companyDestination": "Tradeaux",
                "companyDestinationId": "tradeaux",
                "compDst": "Tradeaux",
                "compDstId": "tradeaux",
                "income": 14200,
                "deadline": "Restam 4h 15min",
                "onJob": True,
            },
            "navigation": {
                "distance": max(10, int(430 - (t * 0.02))),
                "time": "4h 25m",
                "nextRestStop": "6h 15m",
            },
            "placement": {
                "x": round(self._sim_x, 2),
                "y": 0.0,
                "z": round(self._sim_z, 2),
                "heading": round(heading_deg, 1),
            }
        }

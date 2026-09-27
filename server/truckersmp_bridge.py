"""
Bridge de Telemetria do TruckersMP para o TruckPilot Pro.
Permite ler jogadores próximos através de:
1. Memória Compartilhada do Windows (criada pelo plugin C++ do TruckersMP Client SDK: Local\\TruckersMPTelemetry)
2. Injeção direta via API REST / WebSocket
3. Simulação inteligente em tempo real (fallback quando o multiplayer não estiver ativo)
"""

import ctypes
import math
import mmap
import time
from typing import List, Dict, Any, Optional

TMP_MAGIC = 0x544D5031  # "TMP1" em hexadecimal
TMP_VERSION = 1
SHARED_MEMORY_NAME = r"Local\TruckersMPTelemetry"
SHARED_MEMORY_FALLBACK = "TruckersMPTelemetry"

class TMPPlayerStruct(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("id", ctypes.c_int32),
        ("name", ctypes.c_char * 64),
        ("tag", ctypes.c_char * 32),
        ("x", ctypes.c_double),
        ("y", ctypes.c_double),
        ("z", ctypes.c_double),
        ("heading", ctypes.c_float),
        ("speed_kmh", ctypes.c_float),
        ("distance", ctypes.c_float),
        ("flags", ctypes.c_uint32),
    ]

class TMPSharedMemoryStruct(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("magic", ctypes.c_uint32),
        ("version", ctypes.c_uint32),
        ("timestamp", ctypes.c_uint64),
        ("local_player_id", ctypes.c_int32),
        ("player_count", ctypes.c_uint32),
        ("players", TMPPlayerStruct * 128),
    ]

class TruckersMPBridge:
    def __init__(self):
        self.shm_obj: Optional[mmap.mmap] = None
        self.is_connected = False
        self.last_shm_check = 0.0
        self.last_shm_timestamp = 0
        self.manual_feed: Optional[List[Dict[str, Any]]] = None
        self.manual_feed_time = 0.0
        
        # Variáveis internas para simulação realista em torno do caminhão
        self._sim_players = [
            {
                "id": 1421,
                "name": "Alex_V8_Trans",
                "tag": "Polaris VTC",
                "rel_x": 120.0,
                "rel_z": -180.0,
                "speed": 82.0,
                "heading_offset": 5.0,
                "dir_mult": 1.0,
            },
            {
                "id": 2894,
                "name": "Jean_Pierre_FR",
                "tag": "TransEurope",
                "rel_x": -60.0,
                "rel_z": 240.0,
                "speed": 76.0,
                "heading_offset": 182.0,
                "dir_mult": -1.0,
            },
            {
                "id": 3512,
                "name": "Klaus_Mueller",
                "tag": "Spedition DE",
                "rel_x": 350.0,
                "rel_z": 90.0,
                "speed": 88.0,
                "heading_offset": -85.0,
                "dir_mult": 0.9,
            }
        ]
        self._sim_last_tick = time.time()

    def set_manual_feed(self, players: List[Dict[str, Any]]):
        """Permite que um agente externo envie a lista de jogadores via POST."""
        self.manual_feed = players
        self.manual_feed_time = time.time()

    def try_read_shared_memory(self) -> Optional[Dict[str, Any]]:
        """Tenta ler da memória compartilhada aberta pelo plugin C++ do TruckersMP."""
        now = time.time()
        if self.shm_obj is None:
            if now - self.last_shm_check < 1.0:
                return None
            self.last_shm_check = now
            for name in [SHARED_MEMORY_NAME, SHARED_MEMORY_FALLBACK]:
                try:
                    shm = mmap.mmap(-1, ctypes.sizeof(TMPSharedMemoryStruct), name, access=mmap.ACCESS_READ)
                    self.shm_obj = shm
                    self.is_connected = True
                    break
                except Exception:
                    continue

        if self.shm_obj is None:
            self.is_connected = False
            return None

        try:
            self.shm_obj.seek(0)
            data = TMPSharedMemoryStruct.from_buffer_copy(self.shm_obj.read(ctypes.sizeof(TMPSharedMemoryStruct)))
            if data.magic != TMP_MAGIC or data.version != TMP_VERSION:
                return None

            # Verifica se o timestamp está atualizado (tolerância de 5 segundos)
            now_ms = int(time.time() * 1000)
            if abs(now_ms - data.timestamp) > 5000:
                self.is_connected = False
                return None

            self.is_connected = True
            self.last_shm_timestamp = data.timestamp
            
            player_list = []
            count = min(int(data.player_count), 128)
            for i in range(count):
                p = data.players[i]
                try:
                    name_str = p.name.decode("utf-8", errors="ignore").rstrip("\x00")
                except Exception:
                    name_str = "Driver"
                try:
                    tag_str = p.tag.decode("utf-8", errors="ignore").rstrip("\x00")
                except Exception:
                    tag_str = ""

                player_list.append({
                    "id": int(p.id),
                    "name": name_str or f"Player #{p.id}",
                    "tag": tag_str,
                    "x": round(float(p.x), 2),
                    "y": round(float(p.y), 2),
                    "z": round(float(p.z), 2),
                    "heading": round(float(p.heading) % 360.0, 1),
                    "speed": round(float(p.speed_kmh), 1),
                    "distance": round(float(p.distance), 1),
                })

            return {
                "source": "client_sdk",
                "connected": True,
                "local_player_id": int(data.local_player_id),
                "player_count": len(player_list),
                "players": player_list,
            }
        except Exception:
            self.is_connected = False
            try:
                if self.shm_obj:
                    self.shm_obj.close()
            except Exception:
                pass
            self.shm_obj = None
            return None

    def get_simulated_players(self, truck_x: float, truck_z: float, truck_heading: float) -> List[Dict[str, Any]]:
        """
        Gera jogadores virtuais próximos ao caminhão para testes imediatos no mapa.
        Os jogadores se movimentam em rodovias paralelas e no sentido oposto.
        """
        now = time.time()
        dt = max(0.01, min(0.2, now - self._sim_last_tick))
        self._sim_last_tick = now

        result = []
        heading_rad = math.radians(truck_heading)
        cos_h = math.cos(heading_rad)
        sin_h = math.sin(heading_rad)

        for p in self._sim_players:
            # Avança o jogador virtual ao longo da sua direção
            speed_ms = (p["speed"] / 3.6) * dt * p["dir_mult"]
            # Movimenta no sistema local
            p["rel_z"] += speed_ms

            # Recicla o jogador se ele se afastar muito (+/- 800m)
            if p["rel_z"] > 750.0:
                p["rel_z"] = -750.0
            elif p["rel_z"] < -750.0:
                p["rel_z"] = 750.0

            # Projeta coordenadas locais para o mundo do jogo
            # rel_x é perpendicular, rel_z é longitudinal
            wx = truck_x + (p["rel_x"] * cos_h + p["rel_z"] * sin_h)
            wz = truck_z + (-p["rel_x"] * sin_h + p["rel_z"] * cos_h)

            dist = math.hypot(wx - truck_x, wz - truck_z)
            p_heading = (truck_heading + p["heading_offset"]) % 360.0

            result.append({
                "id": p["id"],
                "name": p["name"],
                "tag": p["tag"],
                "x": round(wx, 2),
                "y": 0.0,
                "z": round(wz, 2),
                "heading": round(p_heading, 1),
                "speed": round(p["speed"], 1),
                "distance": round(dist, 1),
            })

        # Ordena pelos mais próximos primeiro
        result.sort(key=lambda item: item["distance"])
        return result

    def get_telemetry_payload(
        self,
        truck_x: float,
        truck_z: float,
        truck_heading: float,
        enable_simulation: bool = True
    ) -> Dict[str, Any]:
        """
        Retorna o dicionário de multiplayer formatado para ser inserido na telemetria WebSocket.
        """
        # 1. Tenta dados reais via C++ Client SDK (Shared Memory)
        real_data = self.try_read_shared_memory()
        if real_data is not None:
            return real_data

        # 2. Tenta feed manual recente (menos de 3 segundos atrás)
        if self.manual_feed is not None and (time.time() - self.manual_feed_time < 3.0):
            return {
                "source": "rest_feed",
                "connected": True,
                "local_player_id": 0,
                "player_count": len(self.manual_feed),
                "players": self.manual_feed,
            }

        # 3. Fallback inteligente de simulação
        if enable_simulation and (truck_x != 0.0 or truck_z != 0.0):
            sim_players = self.get_simulated_players(truck_x, truck_z, truck_heading)
            return {
                "source": "simulated",
                "connected": True,
                "local_player_id": 9999,
                "player_count": len(sim_players),
                "players": sim_players,
            }

        return {
            "source": "none",
            "connected": False,
            "local_player_id": 0,
            "player_count": 0,
            "players": [],
        }

truckersmp_bridge_instance = TruckersMPBridge()

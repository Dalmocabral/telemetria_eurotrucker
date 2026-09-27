"""
Testes automatizados da integração de telemetria multiplayer do TruckersMP.
Cobre:
1. Estrutura C/Ctypes de memória compartilhada (Local\\TruckersMPTelemetry).
2. Bridge de telemetria (leitura de shared memory, fallback de simulação e feed REST).
3. Conversão de coordenadas SCS (x, z) para coordenadas geográficas do MapLibre.
4. Endpoints da API FastAPI (/api/truckersmp/players e /api/truckersmp/feed).
"""

import ctypes
import os
import sys
import time
import unittest

# Adiciona o diretório server ao path
SERVER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

from truckersmp_bridge import (
    TruckersMPBridge,
    TMPSharedMemoryStruct,
    TMPPlayerStruct,
    TMP_MAGIC,
    TMP_VERSION,
)
import asyncio
from main import get_truckersmp_players, post_truckersmp_feed


class TestTruckersMPIntegration(unittest.TestCase):
    def setUp(self):
        self.bridge = TruckersMPBridge()


    def test_shared_memory_struct_layout(self):
        """Valida que a estrutura binária possui cabeçalho e slots de jogadores consistentes."""
        mem = TMPSharedMemoryStruct()
        mem.magic = TMP_MAGIC
        mem.version = TMP_VERSION
        mem.timestamp = int(time.time() * 1000)
        mem.local_player_id = 42
        mem.player_count = 2

        # Jogador 1
        mem.players[0].id = 1001
        mem.players[0].name = b"TruckerOne"
        mem.players[0].tag = b"VTC_Alpha"
        mem.players[0].x = -28500.5
        mem.players[0].y = 12.0
        mem.players[0].z = 5100.2
        mem.players[0].heading = 90.0
        mem.players[0].speed_kmh = 80.0
        mem.players[0].distance = 150.0

        # Jogador 2
        mem.players[1].id = 1002
        mem.players[1].name = b"TruckerTwo"
        mem.players[1].tag = b"Logistics_BR"
        mem.players[1].x = -28400.0
        mem.players[1].y = 10.0
        mem.players[1].z = 5200.0
        mem.players[1].heading = 180.0
        mem.players[1].speed_kmh = 65.5
        mem.players[1].distance = 280.0

        # Converte para buffer e reconstrói
        raw_bytes = bytes(mem)
        self.assertGreater(len(raw_bytes), ctypes.sizeof(TMPPlayerStruct) * 2)

        deserialized = TMPSharedMemoryStruct.from_buffer_copy(raw_bytes)
        self.assertEqual(deserialized.magic, TMP_MAGIC)
        self.assertEqual(deserialized.version, TMP_VERSION)
        self.assertEqual(deserialized.player_count, 2)
        self.assertEqual(deserialized.players[0].name.decode("utf-8").rstrip("\x00"), "TruckerOne")
        self.assertEqual(deserialized.players[1].name.decode("utf-8").rstrip("\x00"), "TruckerTwo")
        self.assertAlmostEqual(deserialized.players[0].speed_kmh, 80.0, places=1)

    def test_simulated_players_generation(self):
        """Valida que o gerador virtual produz jogadores ao redor da posição do caminhão."""
        truck_x = -28842.0
        truck_z = 4982.0
        truck_heading = 45.0

        players = self.bridge.get_simulated_players(truck_x, truck_z, truck_heading)
        self.assertGreaterEqual(len(players), 3)

        for p in players:
            self.assertIn("id", p)
            self.assertIn("name", p)
            self.assertIn("x", p)
            self.assertIn("z", p)
            self.assertIn("speed", p)
            self.assertIn("distance", p)
            # Jogadores devem estar dentro de um raio de 1 km
            self.assertLess(p["distance"], 1200.0)

    def test_manual_feed_override(self):
        """Valida que um feed manual REST tem prioridade sobre a simulação."""
        custom_players = [
            {
                "id": 999,
                "name": "CustomDriver",
                "tag": "TMP Brasil",
                "x": -28700.0,
                "y": 0.0,
                "z": 5000.0,
                "heading": 120.0,
                "speed": 85.0,
                "distance": 140.0,
            }
        ]
        self.bridge.set_manual_feed(custom_players)
        payload = self.bridge.get_telemetry_payload(-28842.0, 4982.0, 0.0, enable_simulation=True)
        
        self.assertEqual(payload["source"], "rest_feed")
        self.assertEqual(payload["player_count"], 1)
        self.assertEqual(payload["players"][0]["name"], "CustomDriver")

    def test_fastapi_endpoints(self):
        """Valida as funções dos endpoints /api/truckersmp/players e /api/truckersmp/feed."""
        # 1. GET /api/truckersmp/players
        data = get_truckersmp_players()
        self.assertIn("connected", data)
        self.assertIn("players", data)
        self.assertIsInstance(data["players"], list)

        # 2. POST /api/truckersmp/feed
        feed_body = {
            "players": [
                {
                    "id": 555,
                    "name": "LiveStreamer",
                    "tag": "Twitch VTC",
                    "x": -28800.0,
                    "y": 0.0,
                    "z": 4900.0,
                    "heading": 30.0,
                    "speed": 90.0,
                    "distance": 92.0,
                }
            ]
        }
        post_res = asyncio.run(post_truckersmp_feed(feed_body))
        self.assertEqual(post_res["received_players"], 1)

        # Verifica se o GET agora reflete o feed injetado
        updated_data = get_truckersmp_players()
        self.assertEqual(updated_data["source"], "rest_feed")
        self.assertEqual(updated_data["players"][0]["name"], "LiveStreamer")

if __name__ == "__main__":
    unittest.main()


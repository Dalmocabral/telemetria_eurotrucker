"""
Testes automatizados para o subsistema de roteamento rodoviário do ETS2.
Valida conversão de coordenadas, carregamento de malha viária, A*, encaixe (map-matching),
resolução de empresa/pátio, fallback de cidade aproximada e telemetria simulada.
"""

import unittest
import math
import os
import sys

# Adiciona o diretório do servidor ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server")))

from router import (
    RoadRouter,
    convert_ets2_to_geo,
    convert_geo_to_ets2,
    geo_distance_meters,
    router_instance,
)
from ets2_reader import ETS2Reader


class TestCoordinateConversion(unittest.TestCase):
    """Testa conversão bidirecional entre coordenadas do ETS2 e Geo WGS84 Mercator."""

    def test_roundtrip_conversion(self):
        """Valida que converter ETS2 -> Geo -> ETS2 preserva o ponto com precisão submétrica."""
        test_points = [
            (-30427.35, 6866.2),   # Região de Paris no mapa ETS2
            (-26539.39, -2480.28), # Região de Lille
            (15200.0, -8500.0),    # Europa Central
            (-12000.0, 32000.0),   # Sul da Europa
            (0.0, 0.0),            # Origem do mapa SCS
        ]

        for orig_x, orig_z in test_points:
            lon, lat = convert_ets2_to_geo(orig_x, orig_z)
            back_x, back_z = convert_geo_to_ets2(lon, lat)

            self.assertAlmostEqual(orig_x, back_x, delta=0.5, msg=f"Falha em X para {orig_x}, {orig_z}")
            self.assertAlmostEqual(orig_z, back_z, delta=0.5, msg=f"Falha em Z para {orig_x}, {orig_z}")

    def test_paris_coordinates(self):
        """Verifica se as coordenadas de Paris no ETS2 convertem para o sistema de coordenadas do mapa."""
        lon, lat = convert_ets2_to_geo(-30427.35, 6866.2)
        # No sistema de projeção do mapa ETS2 (MERCATOR_R = 300000.0 com origem no centro da Europa):
        self.assertAlmostEqual(lon, -5.81, delta=0.1, msg=f"Longitude inesperada para Paris: {lon}")
        self.assertAlmostEqual(lat, -1.31, delta=0.1, msg=f"Latitude inesperada para Paris: {lat}")

    def test_geo_distance_meters(self):
        """Verifica cálculo de distância em metros."""
        p1 = (-5.81, -1.31)   # Paris aprox
        p2 = (-5.08, 0.45)    # Lille aprox
        dist = geo_distance_meters(p1, p2)
        # Paris até Lille é cerca de 200 km em linha reta
        self.assertTrue(180000 <= dist <= 250000, f"Distância inesperada: {dist} metros")


class TestRoadGraphLoading(unittest.TestCase):
    """Verifica se os arquivos da malha viária oficial são carregados corretamente."""

    @classmethod
    def setUpClass(cls):
        cls.router = router_instance
        cls.router.load_data()

    def test_graph_has_nodes_and_edges(self):
        """Verifica que a malha viária possui nós e arestas carregadas."""
        self.assertGreater(len(self.router.node_coords), 10000, "Poucos nós carregados no grafo")
        self.assertGreater(len(self.router.adjacency), 10000, "Poucas arestas carregadas no grafo")

    def test_geometry_buffer_populated(self):
        """Verifica que geometry.bin possui milhões de coordenadas de curva carregadas."""
        self.assertGreater(len(self.router.geom_arr), 1000000, "Buffer de geometria muito pequeno")

    def test_companies_and_cities_loaded(self):
        """Verifica que os bancos de dados de empresas e cidades foram carregados."""
        self.assertGreater(len(self.router.companies), 500, "Poucas empresas carregadas")
        self.assertGreater(len(self.router.cities), 100, "Poucas cidades carregadas")


class TestAStarAlgorithm(unittest.TestCase):
    """Valida o algoritmo A* em grafo sintético e na malha viária real."""

    def test_synthetic_astar(self):
        """Testa o A* em um grafo isolado conhecido para garantir busca de menor caminho."""
        router = RoadRouter.__new__(RoadRouter)
        router.node_coords = {
            1: (0.0, 0.0),
            2: (0.001, 0.0),
            3: (0.002, 0.0),
            4: (0.001, 0.001),
        }
        # 1 -> 2 (100m) -> 3 (100m) = custo 200m
        # 1 -> 4 (150m) -> 3 (200m) = custo 350m
        # 1 -> 3 direto (500m) = custo 500m
        router.adjacency = {
            1: [{"to": 2, "weight": 100.0}, {"to": 4, "weight": 150.0}, {"to": 3, "weight": 500.0}],
            2: [{"to": 3, "weight": 100.0}],
            4: [{"to": 3, "weight": 200.0}],
            3: [],
        }

        path, cost, success = router._run_astar(1, 3)
        self.assertTrue(success)
        self.assertEqual(path, [1, 2, 3])
        self.assertEqual(cost, 200.0)

    def test_real_route_paris_to_lille(self):
        """Calcula rota real de Paris a Lille e verifica continuidade e geometria."""
        result = router_instance.calculate_route(
            start_x=-30427.35,
            start_z=6866.2,
            city_dst_id="lille",
            comp_dst_id="tradeaux",
        )

        self.assertTrue(result["success"], f"Falha ao calcular rota: {result.get('message')}")
        self.assertGreater(result["distance_km"], 200.0, "Distância muito curta para Paris-Lille")
        self.assertLess(result["distance_km"], 450.0, "Distância muito longa para Paris-Lille")
        self.assertGreater(result["node_count"], 10, "Rota deve conter mais de 10 nós rodoviários")
        self.assertGreater(result["point_count"], 50, "Rota deve conter curvas de alta resolução")

        # GeoJSON
        geojson = result["geojson"]
        self.assertEqual(geojson["type"], "Feature")
        self.assertEqual(geojson["geometry"]["type"], "LineString")
        self.assertGreater(len(geojson["geometry"]["coordinates"]), 50)

        # Manobras turn-by-turn
        maneuvers = result.get("maneuvers", [])
        self.assertGreater(len(maneuvers), 0, "Deveria conter manobras de direção")


class TestDestinationResolutionAndSnapping(unittest.TestCase):
    """Valida resolução de empresa/pátio, fallback de cidade aproximada e limites de encaixe."""

    @classmethod
    def setUpClass(cls):
        router_instance.load_data()

    def test_company_resolution_exact(self):
        """Verifica localização precisa de empresa em cidade de destino."""
        dest = router_instance.resolve_destination(
            city_dst_id="lille",
            comp_dst_id="tradeaux",
        )
        self.assertIsNotNone(dest)
        self.assertTrue(dest["is_company"], "Deveria ser marcado como empresa")
        self.assertFalse(dest["is_approximate"], "Empresa cadastrada não deve ser aproximada")
        self.assertIn("Tradeaux", dest["name"])

    def test_city_fallback_approximate(self):
        """Verifica que empresa inexistente gera fallback para cidade aproximada com flag explícita."""
        dest = router_instance.resolve_destination(
            city_dst_id="paris",
            comp_dst_id="empresa_fantasma_xyz_99",
        )
        self.assertIsNotNone(dest)
        self.assertFalse(dest["is_company"])
        self.assertTrue(dest["is_approximate"], "Fallback de cidade DEVE ser marcado como aproximado")
        self.assertIn("Destino aproximado", dest["description"])

    def test_snapping_limits(self):
        """Garante que posições absurdas/fora da malha não conectam incorretamente."""
        # Ponto em Paris (próximo à rodovia, ~2.5km) deve encaixar com limite padrão de 3500m
        paris_lon, paris_lat = convert_ets2_to_geo(-30427.35, 6866.2)
        node = router_instance.snap_to_road(paris_lon, paris_lat, max_distance_meters=3500.0)
        self.assertIsNotNone(node, "Ponto em Paris deveria encaixar na malha")

        # Ponto no meio do Oceano Atlântico (lon: -30.0, lat: 30.0) NÃO deve encaixar
        ocean_node = router_instance.snap_to_road(-30.0, 30.0, max_distance_meters=5000.0)
        self.assertIsNone(ocean_node, "Ponto no meio do oceano não deve encaixar na rede rodoviária")


class TestErrorHandlingAndEdgeCases(unittest.TestCase):
    """Valida tratamento seguro de erros: caminhão fora da estrada, destino não encontrado e grafo desconectado."""

    @classmethod
    def setUpClass(cls):
        router_instance.load_data()

    def test_truck_off_road_error(self):
        """Caminhão em coordenada inexistente retorna erro seguro com mensagem clara."""
        res = router_instance.calculate_route(
            start_x=9999999.0,
            start_z=9999999.0,
            city_dst_id="paris",
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["error"], "START_OFF_ROAD")
        self.assertIn("fora da malha", res["message"])

    def test_unknown_city_destination(self):
        """Destino em cidade inexistente retorna erro seguro."""
        res = router_instance.calculate_route(
            start_x=-30427.35,
            start_z=6866.2,
            city_dst_id="atlantida_cidade_perdida",
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["error"], "DEST_NOT_FOUND")

    def test_isolated_node_no_path(self):
        """Verifica que nós sem conexão rodoviária retornam erro seguro NO_PATH_FOUND."""
        router = RoadRouter.__new__(RoadRouter)
        router.node_coords = {
            1: (2.35, 48.85),
            2: (10.0, 50.0),
        }
        # Grafo totalmente desconectado
        router.adjacency = {1: [], 2: []}
        path, cost, success = router._run_astar(1, 2)
        self.assertFalse(success)
        self.assertEqual(path, [])


class TestDisconnectedTelemetryIntegration(unittest.TestCase):
    """Valida o estado desconectado limpo sem modo demonstração e teste de rota direto."""

    @classmethod
    def setUpClass(cls):
        router_instance.load_data()

    def test_disconnected_telemetry_state(self):
        """Verifica que quando o jogo está fechado, o estado é desconectado e limpo (sem demo)."""
        reader = ETS2Reader()
        data = reader.get_data()

        self.assertFalse(data.get("connected"))
        self.assertFalse(data.get("simulated"))
        self.assertEqual(data.get("truck", {}).get("speed"), 0.0)
        self.assertFalse(data.get("job", {}).get("onJob"))

        # Valida cálculo de rota direto pelo router (ex: Antuérpia para Lille)
        placement = data.get("placement", {})
        route = router_instance.calculate_route(
            start_x=placement["x"],
            start_z=placement["z"],
            city_dst_id="lille",
            city_dst_name="Lille",
            comp_dst_id="tradeaux",
            comp_dst_name="Tradeaux",
        )

        self.assertTrue(route["success"])
        self.assertEqual(route["destination"]["city"], "Lille")
        self.assertIn("Tradeaux", route["destination"]["name"])
        self.assertGreater(route["distance_km"], 50.0)


if __name__ == "__main__":
    unittest.main()

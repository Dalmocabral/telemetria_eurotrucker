"""
Motor de Roteamento Rodoviário para o Euro Truck Simulator 2 (ETS2).
Carrega a malha viária oficial (graph.bin e geometry.bin) e dados de mapa (cities.json e companies.geojson).
Executa busca de menor caminho (A*) sobre a rede real de rodovias do jogo,
encaixe espacial (map-matching) do caminhão e resolução de destino por empresa/pátio ou cidade.
"""

import os
import sys
import json
import math
import array
import heapq
import time
import unicodedata
import re
from typing import Dict, List, Tuple, Optional, Any

MERCATOR_R = 300000.0


def normalize_text(text: Optional[str]) -> str:
    """Normaliza texto removendo acentos, diacríticos, pontuações e caixa alta."""
    if not text:
        return ""
    nfd = unicodedata.normalize("NFD", str(text))
    clean = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", clean.lower())


# Localizações e hubs conhecidos de multiplayer/mods (TruckersMP, etc.)
KNOWN_CUSTOM_LOCATIONS: Dict[str, Dict[str, Any]] = {
    "truckersmp": {"token": "truckersmp", "name": "TruckersMP HQ", "x": 23550.0, "y": -2000.0, "country": "poland"},
    "truckersmphq": {"token": "truckersmp", "name": "TruckersMP HQ", "x": 23550.0, "y": -2000.0, "country": "poland"},
    "tmphq": {"token": "truckersmp", "name": "TruckersMP HQ", "x": 23550.0, "y": -2000.0, "country": "poland"},
    "tmp": {"token": "truckersmp", "name": "TruckersMP HQ", "x": 23550.0, "y": -2000.0, "country": "poland"},
}

# Praças de Pedágio mapeadas no ETS2 (coordenadas nativas X, Z)
ETS2_TOLL_BOOTHS: List[Dict[str, Any]] = [
    {"id": "toll_fr_1", "name": "Péage A1 Senlis", "country": "França", "cost": "€18", "coords_ets2": (-30100.0, 2800.0)},
    {"id": "toll_fr_2", "name": "Péage A6 Fleury", "country": "França", "cost": "€24", "coords_ets2": (-29200.0, 9800.0)},
    {"id": "toll_fr_3", "name": "Péage A7 Vienne", "country": "França", "cost": "€22", "coords_ets2": (-23100.0, 28400.0)},
    {"id": "toll_fr_4", "name": "Péage A10 Saint-Arnoult", "country": "França", "cost": "€28", "coords_ets2": (-33200.0, 9100.0)},
    {"id": "toll_fr_5", "name": "Péage A4 Reims", "country": "França", "cost": "€19", "coords_ets2": (-22800.0, 4900.0)},
    {"id": "toll_fr_6", "name": "Péage A13 Mantes", "country": "França", "cost": "€14", "coords_ets2": (-34500.0, 4200.0)},
    {"id": "toll_fr_7", "name": "Péage A26 Chamouille", "country": "França", "cost": "€16", "coords_ets2": (-26500.0, 1100.0)},
    {"id": "toll_fr_8", "name": "Péage A71 Vierzon", "country": "França", "cost": "€21", "coords_ets2": (-32100.0, 18500.0)},
    {"id": "toll_fr_9", "name": "Péage A9 Montpellier", "country": "França", "cost": "€26", "coords_ets2": (-24500.0, 39500.0)},
    {"id": "toll_it_1", "name": "Barriera Milano Nord", "country": "Itália", "cost": "€16", "coords_ets2": (-2900.0, 26800.0)},
    {"id": "toll_it_2", "name": "Barriera Roma Nord", "country": "Itália", "cost": "€22", "coords_ets2": (3800.0, 39900.0)},
    {"id": "toll_it_3", "name": "Barriera Verona Sud", "country": "Itália", "cost": "€15", "coords_ets2": (2100.0, 29200.0)},
    {"id": "toll_it_4", "name": "Barriera Firenze Ovest", "country": "Itália", "cost": "€18", "coords_ets2": (2900.0, 34800.0)},
    {"id": "toll_it_5", "name": "Barriera Torino Est", "country": "Itália", "cost": "€14", "coords_ets2": (-8100.0, 27500.0)},
    {"id": "toll_it_6", "name": "Barriera Bologna Arcoveggio", "country": "Itália", "cost": "€12", "coords_ets2": (3500.0, 32100.0)},
    {"id": "toll_pl_1", "name": "Pedágio A2 Nowy Tomysl", "country": "Polônia", "cost": "18 PLN", "coords_ets2": (22400.0, -8100.0)},
    {"id": "toll_pl_2", "name": "Pedágio A2 Konin", "country": "Polônia", "cost": "22 PLN", "coords_ets2": (29800.0, -7400.0)},
    {"id": "toll_pl_3", "name": "Pedágio A4 Gliwice", "country": "Polônia", "cost": "16 PLN", "coords_ets2": (28400.0, 3500.0)},
    {"id": "toll_es_1", "name": "Peaje AP-7 La Jonquera", "country": "Espanha", "cost": "€18", "coords_ets2": (-31200.0, 44800.0)},
    {"id": "toll_es_2", "name": "Peaje AP-2 Zaragoza", "country": "Espanha", "cost": "€20", "coords_ets2": (-42100.0, 48200.0)},
    {"id": "toll_es_3", "name": "Peaje AP-6 Guadarrama", "country": "Espanha", "cost": "€15", "coords_ets2": (-52400.0, 49800.0)},
    {"id": "toll_no_1", "name": "Bompenger E6 Oslo", "country": "Noruega", "cost": "55 NOK", "coords_ets2": (4200.0, -42100.0)},
    {"id": "toll_pt_1", "name": "Portagem A1 Alverca", "country": "Portugal", "cost": "€12", "coords_ets2": (-68100.0, 54200.0)},
]

# Postos de Fronteira e Travessias Internacionais mapeados no ETS2
ETS2_BORDER_CROSSINGS: List[Dict[str, Any]] = [
    {"id": "border_calais_eurotunnel", "name": "Eurotunnel (França ➔ Reino Unido)", "type": "trem", "coords_ets2": (-30300.0, -11200.0)},
    {"id": "border_calais_ferry", "name": "Porto de Calais (Balsa)", "type": "balsa", "coords_ets2": (-29900.0, -10500.0)},
    {"id": "border_dover_ferry", "name": "Porto de Dover (Balsa)", "type": "balsa", "coords_ets2": (-33200.0, -12800.0)},
    {"id": "border_fr_ch_basel", "name": "Fronteira França / Suíça (Basel Aduana)", "type": "aduana", "coords_ets2": (-11900.0, 16800.0)},
    {"id": "border_fr_ch_geneve", "name": "Fronteira França / Suíça (Genebra Aduana)", "type": "aduana", "coords_ets2": (-18400.0, 22100.0)},
    {"id": "border_de_ch_basel", "name": "Fronteira Alemanha / Suíça (Weil am Rhein)", "type": "aduana", "coords_ets2": (-11200.0, 15900.0)},
    {"id": "border_de_at_salzburg", "name": "Fronteira Alemanha / Áustria (Salzburg)", "type": "livre", "coords_ets2": (12200.0, 17100.0)},
    {"id": "border_de_at_kufstein", "name": "Fronteira Alemanha / Áustria (Kufstein A12)", "type": "livre", "coords_ets2": (6800.0, 18900.0)},
    {"id": "border_at_it_brenner", "name": "Passo do Brenner (Áustria / Itália)", "type": "livre", "coords_ets2": (3900.0, 24100.0)},
    {"id": "border_at_it_tarvisio", "name": "Fronteira Áustria / Itália (Tarvisio A23)", "type": "livre", "coords_ets2": (16800.0, 24500.0)},
    {"id": "border_de_pl_frankfurt", "name": "Fronteira Alemanha / Polônia (Frankfurt Oder)", "type": "livre", "coords_ets2": (21900.0, -8900.0)},
    {"id": "border_de_pl_gorlitz", "name": "Fronteira Alemanha / Polônia (Görlitz A4)", "type": "livre", "coords_ets2": (23100.0, -2100.0)},
    {"id": "border_de_cz_dresden", "name": "Fronteira Alemanha / Rep. Tcheca (Dresden - Usti)", "type": "livre", "coords_ets2": (17400.0, 1200.0)},
    {"id": "border_de_cz_rozvadov", "name": "Fronteira Alemanha / Rep. Tcheca (Rozvadov D5)", "type": "livre", "coords_ets2": (9800.0, 6900.0)},
    {"id": "border_fr_es_irun", "name": "Fronteira França / Espanha (Irun / Biriatou)", "type": "livre", "coords_ets2": (-41200.0, 38900.0)},
    {"id": "border_fr_es_jonquera", "name": "Fronteira França / Espanha (La Jonquera AP-7)", "type": "livre", "coords_ets2": (-31400.0, 44200.0)},
    {"id": "border_es_pt_badajoz", "name": "Fronteira Espanha / Portugal (Badajoz - Elvas)", "type": "livre", "coords_ets2": (-61200.0, 51400.0)},
    {"id": "border_es_pt_vilar", "name": "Fronteira Espanha / Portugal (Vilar Formoso)", "type": "livre", "coords_ets2": (-58900.0, 43200.0)},
    {"id": "border_dk_se_oresund", "name": "Ponte de Øresund (Dinamarca ➔ Suécia)", "type": "pedagio_fronteira", "coords_ets2": (5800.0, -32400.0)},
    {"id": "border_de_dk_flensburg", "name": "Fronteira Alemanha / Dinamarca (Flensburg E45)", "type": "livre", "coords_ets2": (1200.0, -26500.0)},
]


def convert_ets2_to_geo(game_x: float, game_z: float) -> Tuple[float, float]:
    """Converte coordenadas nativas do ETS2 (game_x, game_z) para Geo WGS84 Mercator (lon, lat)."""
    if not (isinstance(game_x, (int, float)) and isinstance(game_z, (int, float))):
        return 0.0, 0.0
    if not (math.isfinite(game_x) and math.isfinite(game_z)):
        return 0.0, 0.0
    lon = (game_x / MERCATOR_R) * (180.0 / math.pi)
    y_merc = -game_z / MERCATOR_R
    lat_rad = 2.0 * math.atan(math.exp(y_merc)) - math.pi / 2.0
    lat = lat_rad * (180.0 / math.pi)
    return lon, lat


def convert_geo_to_ets2(lon: float, lat: float) -> Tuple[float, float]:
    """Converte coordenadas Geo WGS84 (lon, lat) de volta para o sistema nativo do ETS2 (game_x, game_z)."""
    if not (isinstance(lon, (int, float)) and isinstance(lat, (int, float))):
        return 0.0, 0.0
    game_x = lon * (math.pi / 180.0) * MERCATOR_R
    lat_rad = lat * (math.pi / 180.0)
    # Evita divisão por zero nos polos
    lat_rad = max(-1.48, min(1.48, lat_rad))
    y_merc = math.log(math.tan((lat_rad + math.pi / 2.0) / 2.0))
    game_z = -y_merc * MERCATOR_R
    return game_x, game_z


def geo_distance_meters(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calcula a distância aproximada em metros entre dois pontos (lon, lat) na projeção Mercator."""
    dx = (coord1[0] - coord2[0]) * 72150.0
    dy = (coord1[1] - coord2[1]) * 111000.0
    return math.sqrt(dx * dx + dy * dy)


class RoadRouter:
    """
    Roteador da rede rodoviária do ETS2 com A*, indexação espacial e resolução de empresas.
    """

    def __init__(self, map_dir: Optional[str] = None):
        if not map_dir:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            candidate = os.path.join(base_dir, "..", "client", "public", "maps", "ets2")
            if os.path.exists(candidate):
                map_dir = candidate
            else:
                dist_candidate = os.path.join(base_dir, "..", "client", "dist", "maps", "ets2")
                if os.path.exists(dist_candidate):
                    map_dir = dist_candidate
                elif getattr(sys, 'frozen', False):
                    meipass = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
                    alt1 = os.path.join(meipass, "client", "dist", "maps", "ets2")
                    alt2 = os.path.join(meipass, "client", "public", "maps", "ets2")
                    map_dir = alt1 if os.path.exists(alt1) else alt2
                else:
                    map_dir = candidate

        self.map_dir = os.path.abspath(map_dir)
        self.is_loaded = False
        self.load_error = None

        # Dados da malha viária
        self.node_coords: Dict[int, Tuple[float, float]] = {}
        self.adjacency: Dict[int, List[Dict[str, Any]]] = {}
        self.geom_arr: Optional[array.array] = None

        # Grade espacial para snapping rápido (cell_size = 0.02 graus ~ 2km)
        self.cell_size = 0.02
        self.spatial_grid: Dict[Tuple[int, int], List[int]] = {}

        # Dados de cidades e empresas
        self.cities: List[Dict[str, Any]] = []
        self.companies: List[Dict[str, Any]] = []
        self.company_mappings: Dict[str, Any] = {}

    def load_data(self) -> bool:
        """Carrega os arquivos binários e JSONs da pasta de mapas."""
        if self.is_loaded:
            return True

        graph_path = os.path.join(self.map_dir, "roadnetwork", "graph.bin")
        geom_path = os.path.join(self.map_dir, "roadnetwork", "geometry.bin")
        cities_path = os.path.join(self.map_dir, "map-data", "cities.json")
        companies_path = os.path.join(self.map_dir, "map-data", "companies.geojson")
        mapping_path = os.path.join(self.map_dir, "map-data", "RealCompaniesModVanillaMapping.json")

        if not os.path.exists(graph_path) or not os.path.exists(geom_path):
            self.load_error = f"Arquivos de malha viária ausentes em: {graph_path}"
            return False

        t0 = time.time()
        try:
            # 1. Carrega geometria e grafo binários via array nativo C do Python
            geom_size = os.path.getsize(geom_path) // 4
            self.geom_arr = array.array("f")
            with open(geom_path, "rb") as f:
                self.geom_arr.fromfile(f, geom_size)

            graph_size = os.path.getsize(graph_path) // 4
            graph_arr = array.array("f")
            with open(graph_path, "rb") as f:
                graph_arr.fromfile(f, graph_size)

            # 2. Constrói listas de adjacência e coordenadas dos nós
            self.node_coords.clear()
            self.adjacency.clear()
            self.spatial_grid.clear()

            stride = 12
            for i in range(0, len(graph_arr), stride):
                u = int(graph_arr[i])
                v = int(graph_arr[i + 1])
                weight = float(graph_arr[i + 2])
                h_in = float(graph_arr[i + 3])
                h_out = float(graph_arr[i + 4])
                is_ferry = bool(int(graph_arr[i + 5]) == 1)
                req_dlc = int(graph_arr[i + 6])
                start_idx = int(graph_arr[i + 8])
                point_count = int(graph_arr[i + 9])
                maneuver = int(graph_arr[i + 10])
                exit_num = int(graph_arr[i + 11])

                if u not in self.adjacency:
                    self.adjacency[u] = []
                self.adjacency[u].append({
                    "to": v,
                    "weight": weight,
                    "hIn": h_in,
                    "hOut": h_out,
                    "isFerry": is_ferry,
                    "requiredDlc": req_dlc,
                    "startIndex": start_idx,
                    "pointCount": point_count,
                    "maneuverType": maneuver,
                    "exitNumber": exit_num,
                })

                if u not in self.node_coords and start_idx + 1 < len(self.geom_arr):
                    self.node_coords[u] = (self.geom_arr[start_idx], self.geom_arr[start_idx + 1])
                if v not in self.node_coords and point_count > 0:
                    end_idx = start_idx + (point_count - 1) * 2
                    if end_idx + 1 < len(self.geom_arr):
                        self.node_coords[v] = (self.geom_arr[end_idx], self.geom_arr[end_idx + 1])

            # 3. Popula a grade espacial para snapping
            for node_id, (lon, lat) in self.node_coords.items():
                cx = int(lon / self.cell_size)
                cy = int(lat / self.cell_size)
                cell = (cx, cy)
                if cell not in self.spatial_grid:
                    self.spatial_grid[cell] = []
                self.spatial_grid[cell].append(node_id)

            # 4. Carrega metadados de cidades e empresas se existirem
            if os.path.exists(cities_path):
                with open(cities_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.cities = data if isinstance(data, list) else list(data.values())

            if os.path.exists(companies_path):
                with open(companies_path, "r", encoding="utf-8") as f:
                    comp_data = json.load(f)
                    self.companies = comp_data.get("features", [])

            if os.path.exists(mapping_path):
                with open(mapping_path, "r", encoding="utf-8") as f:
                    self.company_mappings = json.load(f)

            self.is_loaded = True
            t1 = time.time()
            print(f"[RoadRouter] Malha viária ETS2 carregada em {t1 - t0:.2f}s ({len(self.node_coords)} nós, {len(self.adjacency)} arestas, {len(self.companies)} empresas).")
            return True

        except Exception as e:
            self.load_error = str(e)
            print(f"[RoadRouter] Erro ao carregar dados do mapa: {e}")
            return False

    def snap_to_road(self, lon: float, lat: float, max_distance_meters: float = 2500.0) -> Optional[int]:
        """
        Encontra o nó de rodovia mais próximo das coordenadas (lon, lat).
        Aplica um limite rígido de distância para evitar saltos absurdos (fora da estrada, pátio ou balsa).
        """
        if not self.is_loaded or not self.node_coords:
            return None

        cx = int(lon / self.cell_size)
        cy = int(lat / self.cell_size)

        candidates = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                candidates.extend(self.spatial_grid.get((cx + dx, cy + dy), []))

        # Se a célula estiver vazia (área remota), expande para 2 células
        if not candidates:
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-2, -1, 0, 1, 2):
                    candidates.extend(self.spatial_grid.get((cx + dx, cy + dy), []))

        if not candidates:
            return None

        best_node = None
        min_dist = float("inf")
        target = (lon, lat)

        for node_id in candidates:
            coord = self.node_coords.get(node_id)
            if not coord:
                continue
            d = geo_distance_meters(target, coord)
            if d < min_dist:
                min_dist = d
                best_node = node_id

        if min_dist <= max_distance_meters:
            return best_node
        return None

    def resolve_destination(
        self,
        city_dst_id: Optional[str] = None,
        city_dst_name: Optional[str] = None,
        comp_dst_id: Optional[str] = None,
        comp_dst_name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Localiza o ponto exato da empresa/pátio de destino na malha do mapa.
        Se a empresa não for identificada, utiliza o centro aproximado da cidade com flag explícita.
        """
        c_id_clean = (city_dst_id or "").lower().strip()
        c_name_clean = (city_dst_name or "").lower().strip()
        norm_id = normalize_text(city_dst_id)
        norm_name = normalize_text(city_dst_name)

        # 1. Verifica hubs e locais especiais de multiplayer (ex: TruckersMP HQ)
        for key in (norm_id, norm_name, c_id_clean, c_name_clean):
            if key in KNOWN_CUSTOM_LOCATIONS:
                custom_loc = KNOWN_CUSTOM_LOCATIONS[key]
                cx = custom_loc["x"]
                cy = custom_loc["y"]
                clon, clat = convert_ets2_to_geo(cx, cy)
                return {
                    "coordinates": [float(clon), float(clat)],
                    "name": custom_loc["name"],
                    "city": custom_loc["name"],
                    "city_token": custom_loc["token"],
                    "is_company": True,
                    "is_approximate": False,
                    "description": f"{custom_loc['name']} (Multiplayer Hub)",
                }

        # 2. Localiza a cidade correspondente em self.cities
        target_city = None
        # Passo 2A: Correspondência exata
        for c in self.cities:
            tok = c.get("token", "").lower()
            name = c.get("name", "").lower()
            if (c_id_clean and tok == c_id_clean) or (c_name_clean and name == c_name_clean):
                target_city = c
                break

        # Passo 2B: Correspondência normalizada sem acentos (ex: Wroclaw == Wrocław, Koln == Köln)
        if not target_city:
            for c in self.cities:
                c_tok_norm = normalize_text(c.get("token", ""))
                c_name_norm = normalize_text(c.get("name", ""))
                if (norm_id and (c_tok_norm == norm_id or c_name_norm == norm_id)) or \
                   (norm_name and (c_name_norm == norm_name or c_tok_norm == norm_name)):
                    target_city = c
                    break

        # Passo 2C: Correspondência por contenção parcial (ex: "stuttgart" in "stuttgart (de)")
        if not target_city:
            for c in self.cities:
                c_tok_norm = normalize_text(c.get("token", ""))
                c_name_norm = normalize_text(c.get("name", ""))
                if norm_name and len(norm_name) >= 4 and (norm_name in c_name_norm or c_name_norm in norm_name):
                    target_city = c
                    break
                if norm_id and len(norm_id) >= 4 and (norm_id in c_tok_norm or c_tok_norm in norm_id):
                    target_city = c
                    break

        # 3. Se cidade encontrada, busca empresa próxima
        if target_city:
            city_x = target_city.get("x", 0.0)
            city_y = target_city.get("y", 0.0)
            city_lon, city_lat = convert_ets2_to_geo(city_x, city_y)

            comp_id_clean = (comp_dst_id or "").lower().strip()
            comp_name_clean = (comp_dst_name or "").lower().strip()
            norm_comp_id = normalize_text(comp_dst_id)
            norm_comp_name = normalize_text(comp_dst_name)

            alt_names = set()
            if comp_id_clean in self.company_mappings:
                entry = self.company_mappings[comp_id_clean]
                alt_names.add(entry.get("name", "").lower())
                alt_names.add(entry.get("sort_name", "").lower())

            target_comp = None
            if comp_id_clean or comp_name_clean or alt_names:
                city_center = (city_lon, city_lat)
                candidates = []
                for feat in self.companies:
                    coords = feat.get("geometry", {}).get("coordinates", [])
                    if len(coords) >= 2 and geo_distance_meters(city_center, (coords[0], coords[1])) < 40000.0:
                        candidates.append(feat)

                # Prioriza candidatos mais próximos do centro da cidade de destino (evita empresas em cidades vizinhas como Dortmund vs Duisburg)
                candidates.sort(key=lambda feat: geo_distance_meters(city_center, (feat["geometry"]["coordinates"][0], feat["geometry"]["coordinates"][1])))

                # Prioridade 1: ID exato do sprite / token
                for cand in candidates:
                    props = cand.get("properties", {})
                    sprite = props.get("sprite", "").lower()
                    if comp_id_clean and sprite == comp_id_clean:
                        target_comp = cand
                        break

                # Prioridade 2: Nome da empresa coincide ou está contido
                if not target_comp:
                    for cand in candidates:
                        props = cand.get("properties", {})
                        pname = props.get("poiName", "").lower()
                        norm_pname = normalize_text(pname)
                        if comp_name_clean and (comp_name_clean in pname or pname in comp_name_clean):
                            target_comp = cand
                            break
                        if norm_comp_name and (norm_comp_name in norm_pname or norm_pname in norm_comp_name):
                            target_comp = cand
                            break
                        if any(alt in pname for alt in alt_names if alt):
                            target_comp = cand
                            break

            if target_comp:
                coords = target_comp["geometry"]["coordinates"]
                return {
                    "coordinates": [float(coords[0]), float(coords[1])],
                    "name": target_comp.get("properties", {}).get("poiName", comp_dst_name or "Empresa"),
                    "city": target_city.get("name", "Destino"),
                    "city_token": target_city.get("token", ""),
                    "is_company": True,
                    "is_approximate": False,
                    "description": f"{target_comp.get('properties', {}).get('poiName')} ({target_city.get('name')})",
                }

            # Fallback aproximado no centro da cidade
            return {
                "coordinates": [float(city_lon), float(city_lat)],
                "name": target_city.get("name", "Destino"),
                "city": target_city.get("name", "Destino"),
                "city_token": target_city.get("token", ""),
                "is_company": False,
                "is_approximate": True,
                "description": f"Centro de {target_city.get('name')} (Destino aproximado)",
            }

        # 4. Fallback global: Se a cidade não estiver mapeada, mas a empresa existir (ex: Cargotras)
        comp_id_clean = (comp_dst_id or "").lower().strip()
        comp_name_clean = (comp_dst_name or "").lower().strip()
        if comp_id_clean or comp_name_clean:
            for feat in self.companies:
                props = feat.get("properties", {})
                sprite = props.get("sprite", "").lower()
                pname = props.get("poiName", "").lower()
                if (comp_id_clean and sprite == comp_id_clean) or (comp_name_clean and comp_name_clean in pname):
                    coords = feat.get("geometry", {}).get("coordinates", [])
                    if len(coords) >= 2:
                        return {
                            "coordinates": [float(coords[0]), float(coords[1])],
                            "name": props.get("poiName", comp_dst_name or "Empresa"),
                            "city": city_dst_name or city_dst_id or "Destino",
                            "city_token": city_dst_id or "",
                            "is_company": True,
                            "is_approximate": True,
                            "description": f"{props.get('poiName')} (Destino)",
                        }

        return None

    def calculate_route(
        self,
        start_x: float,
        start_z: float,
        city_dst_id: Optional[str] = None,
        city_dst_name: Optional[str] = None,
        comp_dst_id: Optional[str] = None,
        comp_dst_name: Optional[str] = None,
        max_iterations: int = 150000,
    ) -> Dict[str, Any]:
        """
        Calcula o percurso sobre as estradas reais do ETS2 entre a posição atual e o destino.
        Retorna GeoJSON FeatureCollection com a linha da rota, metadados e manobras.
        """
        if not self.is_loaded:
            if not self.load_data():
                return {
                    "success": False,
                    "error": "ROUTER_NOT_INITIALIZED",
                    "message": f"Falha ao carregar malha viária: {self.load_error}",
                }

        # 1. Converte e encaixa posição do caminhão
        start_lon, start_lat = convert_ets2_to_geo(start_x, start_z)
        start_node = self.snap_to_road(start_lon, start_lat, max_distance_meters=3500.0)

        if start_node is None:
            return {
                "success": False,
                "error": "START_OFF_ROAD",
                "message": "Caminhão fora da malha rodoviária mapeada (pátio isolado, balsa ou mapa não suportado).",
                "truck_coords": [start_lon, start_lat],
            }

        # 2. Resolve ponto de destino
        dest_info = self.resolve_destination(
            city_dst_id=city_dst_id,
            city_dst_name=city_dst_name,
            comp_dst_id=comp_dst_id,
            comp_dst_name=comp_dst_name,
        )

        if not dest_info:
            return {
                "success": False,
                "error": "DEST_NOT_FOUND",
                "message": f"Cidade de destino '{city_dst_name or city_dst_id}' não localizada no mapa.",
            }

        dest_lon, dest_lat = dest_info["coordinates"]
        target_node = self.snap_to_road(dest_lon, dest_lat, max_distance_meters=4500.0)

        if target_node is None:
            return {
                "success": False,
                "error": "DEST_NOT_SNAPPED",
                "message": f"Destino em {dest_info['name']} não possui conexão rodoviária próxima mapeada.",
                "destination": dest_info,
            }

        # 3. Executa A* sobre o grafo
        if start_node == target_node:
            coords = [self.node_coords[start_node], [dest_lon, dest_lat]]
            return {
                "success": True,
                "distance_meters": 50.0,
                "distance_km": 0.1,
                "destination": dest_info,
                "geojson": self._build_geojson_feature(coords, dest_info),
                "maneuvers": [{"type": "destination", "distance": 0, "instruction": f"Chegada ao destino em {dest_info['name']}"}],
            }

        path_nodes, cost, success = self._run_astar(start_node, target_node, max_iterations=max_iterations)

        if not success or not path_nodes:
            return {
                "success": False,
                "error": "NO_PATH_FOUND",
                "message": "Sem conexão rodoviária direta encontrada até o destino (rede desconectada, balsa ou DLC necessária ausente).",
                "destination": dest_info,
            }

        # 4. Extrai a geometria contínua de alta resolução a partir do geometry.bin
        route_coords = self._extract_path_geometry(path_nodes)
        
        # Garante que o início se conecta ao caminhão e o fim ao pátio da empresa
        if route_coords:
            route_coords.insert(0, [start_lon, start_lat])
            route_coords.append([dest_lon, dest_lat])

        # 5. Gera instruções de manobra reais a partir dos ângulos da rota
        maneuvers = self._generate_maneuvers(route_coords, path_nodes)

        primary_eta_min = max(1, round((cost / 1000.0) / 72.0 * 60.0))
        primary_feature = self._build_geojson_feature(route_coords, dest_info, cost)
        primary_tolls, primary_borders = self._detect_tolls_and_borders(route_coords)

        primary_route_obj = {
            "id": "primary",
            "name": "Mais rápida",
            "distance_meters": round(cost),
            "distance_km": round(cost / 1000.0, 1),
            "eta_minutes": primary_eta_min,
            "eta_formatted": f"{primary_eta_min // 60}h {primary_eta_min % 60:02d}m" if primary_eta_min >= 60 else f"{primary_eta_min} min",
            "diff_km": "0 km",
            "diff_minutes": "0 min",
            "tolls_count": len(primary_tolls),
            "tolls": primary_tolls,
            "borders_count": len(primary_borders),
            "borders": primary_borders,
            "is_fastest": True,
            "geojson": primary_feature,
            "maneuvers": maneuvers,
        }

        routes = [primary_route_obj]

        # 6. Cálculo de Rota Alternativa Inteligente (Estilo Google Maps)
        # Tenta traçar uma via alternativa penalizando o corredor viário principal
        if len(path_nodes) >= 12:
            cutoff_start = max(1, int(len(path_nodes) * 0.08))
            cutoff_end = min(len(path_nodes) - 1, max(cutoff_start + 1, int(len(path_nodes) * 0.92)))
            penalized_edges = set()
            for i in range(cutoff_start, cutoff_end):
                penalized_edges.add((path_nodes[i], path_nodes[i + 1]))
                penalized_edges.add((path_nodes[i + 1], path_nodes[i]))

            alt_nodes, alt_cost, alt_ok = self._run_astar(
                start_node, 
                target_node, 
                max_iterations=max_iterations,
                penalized_edges=penalized_edges,
                penalty_factor=2.4
            )

            if alt_ok and alt_nodes and len(alt_nodes) >= 5:
                # Calcula sobreposição com a rota principal
                common_nodes = set(path_nodes).intersection(set(alt_nodes))
                overlap_ratio = len(common_nodes) / max(1, len(path_nodes))
                
                # Aceita alternativa se divergir substancialmente (< 88% sobreposição)
                # e não for excessivamente longa (<= 1.55x da rota principal)
                if overlap_ratio < 0.88 and (cost * 0.95 <= alt_cost <= cost * 1.55) and abs(alt_cost - cost) > 400.0:
                    alt_coords = self._extract_path_geometry(alt_nodes)
                    if alt_coords:
                        alt_coords.insert(0, [start_lon, start_lat])
                        alt_coords.append([dest_lon, dest_lat])

                    alt_maneuvers = self._generate_maneuvers(alt_coords, alt_nodes)
                    alt_eta_min = max(1, round((alt_cost / 1000.0) / 72.0 * 60.0))
                    alt_tolls, alt_borders = self._detect_tolls_and_borders(alt_coords)
                    
                    diff_km_num = round((alt_cost - cost) / 1000.0, 1)
                    diff_min_num = alt_eta_min - primary_eta_min
                    
                    diff_km_str = f"+{diff_km_num} km" if diff_km_num > 0 else f"{diff_km_num} km"
                    diff_min_str = f"+{diff_min_num} min" if diff_min_num > 0 else f"{diff_min_num} min"

                    alt_feature = self._build_geojson_feature(alt_coords, dest_info, alt_cost)
                    alt_feature["properties"]["is_alternative"] = True

                    routes.append({
                        "id": "alternative",
                        "name": "Via alternativa",
                        "distance_meters": round(alt_cost),
                        "distance_km": round(alt_cost / 1000.0, 1),
                        "eta_minutes": alt_eta_min,
                        "eta_formatted": f"{alt_eta_min // 60}h {alt_eta_min % 60:02d}m" if alt_eta_min >= 60 else f"{alt_eta_min} min",
                        "diff_km": diff_km_str,
                        "diff_minutes": diff_min_str,
                        "diff_seconds": diff_min_num * 60,
                        "tolls_count": len(alt_tolls),
                        "tolls": alt_tolls,
                        "borders_count": len(alt_borders),
                        "borders": alt_borders,
                        "is_fastest": False,
                        "overlap_percent": round(overlap_ratio * 100, 1),
                        "geojson": alt_feature,
                        "maneuvers": alt_maneuvers,
                    })

        return {
            "success": True,
            "distance_meters": round(cost),
            "distance_km": round(cost / 1000.0, 1),
            "node_count": len(path_nodes),
            "point_count": len(route_coords),
            "destination": dest_info,
            "maneuvers": maneuvers,
            "geojson": primary_feature,
            "routes": routes,
        }

    def _run_astar(
        self,
        start_node: int,
        target_node: int,
        max_iterations: int = 150000,
        penalized_edges: Optional[Set[Tuple[int, int]]] = None,
        penalty_factor: float = 2.4,
    ) -> Tuple[List[int], float, bool]:
        """Algoritmo A* com heurística Euclidiana e suporte a penalização para rotas alternativas."""
        target_coord = self.node_coords[target_node]
        tx, ty = target_coord

        frontier: List[Tuple[float, int]] = [(0.0, start_node)]
        came_from: Dict[int, Optional[int]] = {start_node: None}
        cost_so_far: Dict[int, float] = {start_node: 0.0}

        iters = 0
        while frontier:
            iters += 1
            if iters > max_iterations:
                break

            _, current = heapq.heappop(frontier)
            if current == target_node:
                break

            cur_cost = cost_so_far[current]
            for edge in self.adjacency.get(current, []):
                neighbor = edge["to"]
                weight = edge["weight"]

                if penalized_edges and ((current, neighbor) in penalized_edges or (neighbor, current) in penalized_edges):
                    weight = weight * penalty_factor

                new_cost = cur_cost + weight
                if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                    cost_so_far[neighbor] = new_cost
                    n_coord = self.node_coords.get(neighbor)
                    if n_coord:
                        dx = (n_coord[0] - tx) * 72150.0
                        dy = (n_coord[1] - ty) * 111000.0
                        h = math.sqrt(dx * dx + dy * dy)
                    else:
                        h = 0.0

                    heapq.heappush(frontier, (new_cost + h, neighbor))
                    came_from[neighbor] = current

        if target_node not in came_from:
            return [], 0.0, False

        # Reconstrói a sequência de nós
        path = []
        curr = target_node
        while curr is not None:
            path.append(curr)
            curr = came_from[curr]
        path.reverse()

        # Calcula o custo real sem multiplicadores de penalidade
        real_cost = 0.0
        for i in range(len(path) - 1):
            u = path[i]
            v = path[i + 1]
            for edge in self.adjacency.get(u, []):
                if edge["to"] == v:
                    real_cost += edge["weight"]
                    break

        return path, real_cost, True

    def _extract_path_geometry(self, path_nodes: List[int]) -> List[List[float]]:
        """Extrai todos os pontos intermediários das curvas a partir do geometry.bin."""
        if not self.geom_arr or len(path_nodes) < 2:
            return [list(self.node_coords[n]) for n in path_nodes if n in self.node_coords]

        coords: List[List[float]] = []
        for i in range(len(path_nodes) - 1):
            u = path_nodes[i]
            v = path_nodes[i + 1]

            # Encontra a aresta específica que conecta u a v
            edge = None
            for e in self.adjacency.get(u, []):
                if e["to"] == v:
                    edge = e
                    break

            if edge and edge["pointCount"] > 0:
                s_idx = edge["startIndex"]
                count = edge["pointCount"]
                for p in range(count):
                    px = self.geom_arr[s_idx + p * 2]
                    py = self.geom_arr[s_idx + p * 2 + 1]
                    if not coords or (coords[-1][0] != px or coords[-1][1] != py):
                        coords.append([px, py])
            else:
                u_coord = self.node_coords.get(u)
                if u_coord and (not coords or coords[-1] != list(u_coord)):
                    coords.append([u_coord[0], u_coord[1]])

        end_coord = self.node_coords.get(path_nodes[-1])
        if end_coord and (not coords or coords[-1] != list(end_coord)):
            coords.append([end_coord[0], end_coord[1]])

        return coords

    def _detect_tolls_and_borders(self, coords: List[List[float]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Detecta praças de pedágio e postos de fronteira reais ao longo da rota."""
        if not coords or len(coords) < 2:
            return [], []

        # Amostra pontos a cada ~30m para verificação rápida
        step = max(1, len(coords) // 250)
        sampled_coords = [coords[i] for i in range(0, len(coords), step)]
        if sampled_coords[-1] != coords[-1]:
            sampled_coords.append(coords[-1])

        detected_tolls = []
        for toll in ETS2_TOLL_BOOTHS:
            t_lon, t_lat = convert_ets2_to_geo(*toll["coords_ets2"])
            t_pos = (t_lon, t_lat)
            for pt in sampled_coords:
                if geo_distance_meters(t_pos, (pt[0], pt[1])) < 220.0:
                    detected_tolls.append({
                        "name": toll["name"],
                        "cost": toll["cost"],
                        "country": toll["country"],
                    })
                    break

        detected_borders = []
        for border in ETS2_BORDER_CROSSINGS:
            b_lon, b_lat = convert_ets2_to_geo(*border["coords_ets2"])
            b_pos = (b_lon, b_lat)
            for pt in sampled_coords:
                if geo_distance_meters(b_pos, (pt[0], pt[1])) < 280.0:
                    detected_borders.append({
                        "name": border["name"],
                        "type": border["type"],
                    })
                    break

        return detected_tolls, detected_borders

    def _generate_maneuvers(self, coords: List[List[float]], path_nodes: List[int]) -> List[Dict[str, Any]]:
        """Gera lista de manobras de alta precisão baseada em janela métrica contínua e bifurcações reais."""
        if len(coords) < 3:
            return [{
                "type": "destination",
                "distance": 0,
                "instruction": "Destino final à frente",
                "turn_text": "Destino final",
                "point": coords[-1] if coords else [0.0, 0.0],
                "point_before": coords[0] if coords else [0.0, 0.0],
                "point_after": coords[-1] if coords else [0.0, 0.0],
                "coord_index": 0,
            }]

        # Pré-computa distâncias acumuladas para precisão métrica
        cum = [0.0]
        for i in range(len(coords) - 1):
            cum.append(cum[-1] + geo_distance_meters((coords[i][0], coords[i][1]), (coords[i + 1][0], coords[i + 1][1])))

        LOOK_DIST = 50.0  # Janela de análise de 50 metros antes e depois
        raw_turns = []
        for i in range(1, len(coords) - 1):
            cur_d = cum[i]
            i_back = i - 1
            while i_back > 0 and (cur_d - cum[i_back]) < LOOK_DIST:
                i_back -= 1
            i_fwd = i + 1
            while i_fwd < len(coords) - 1 and (cum[i_fwd] - cur_d) < LOOK_DIST:
                i_fwd += 1

            p_back = coords[i_back]
            p_cur = coords[i]
            p_fwd = coords[i_fwd]

            v1 = (p_cur[0] - p_back[0], p_cur[1] - p_back[1])
            v2 = (p_fwd[0] - p_cur[0], p_fwd[1] - p_cur[1])

            a1 = math.atan2(v1[1], v1[0])
            a2 = math.atan2(v2[1], v2[0])
            diff = math.degrees(a2 - a1)
            while diff > 180.0: diff -= 360.0
            while diff < -180.0: diff += 360.0

            if abs(diff) >= 20.0:
                raw_turns.append((i, cur_d, diff, p_cur))

        # Agrupa curvas consecutivas num raio de 85m para encontrar o ápice
        clustered = []
        if raw_turns:
            cur_cluster = [raw_turns[0]]
            for t in raw_turns[1:]:
                if t[1] - cur_cluster[-1][1] < 85.0:
                    cur_cluster.append(t)
                else:
                    apex = max(cur_cluster, key=lambda x: abs(x[2]))
                    clustered.append(apex)
                    cur_cluster = [t]
            if cur_cluster:
                apex = max(cur_cluster, key=lambda x: abs(x[2]))
                clustered.append(apex)

        maneuvers = []
        for idx, d, diff, pt in clustered:
            # diff < 0 é curva no sentido horário (DIREITA na malha cartográfica)
            # diff > 0 é curva no sentido anti-horário (ESQUERDA na malha cartográfica)
            if diff < -20.0:
                if diff < -95.0:
                    m_type = "sharp-right"
                    turn_text = "Curva acentuada à direita"
                elif diff < -50.0:
                    m_type = "right"
                    turn_text = "Vire à direita"
                else:
                    m_type = "slight-right"
                    turn_text = "Mantenha à direita"
            elif diff > 20.0:
                if diff > 95.0:
                    m_type = "sharp-left"
                    turn_text = "Curva acentuada à esquerda"
                elif diff > 50.0:
                    m_type = "left"
                    turn_text = "Vire à esquerda"
                else:
                    m_type = "slight-left"
                    turn_text = "Mantenha à esquerda"
            else:
                continue

            pt_before = coords[max(0, idx - 4)]
            pt_after = coords[min(len(coords) - 1, idx + 4)]

            maneuvers.append({
                "type": m_type,
                "distance": int(d),
                "instruction": turn_text,
                "turn_text": turn_text,
                "angle": round(diff, 1),
                "point": pt,
                "point_before": pt_before,
                "point_after": pt_after,
                "coord_index": idx,
            })

        # Adiciona o destino final como a última manobra
        maneuvers.append({
            "type": "destination",
            "distance": int(cum[-1]),
            "instruction": "Destino final à frente",
            "turn_text": "Seu destino final",
            "point": coords[-1],
            "point_before": coords[-2] if len(coords) >= 2 else coords[-1],
            "point_after": coords[-1],
            "coord_index": len(coords) - 1,
        })

        return maneuvers

    def _build_geojson_feature(
        self,
        coordinates: List[List[float]],
        destination: Dict[str, Any],
        distance_meters: float = 0.0,
    ) -> Dict[str, Any]:
        """Empacota a linha de rota em um objeto GeoJSON padrão RFC 7946."""
        return {
            "type": "Feature",
            "properties": {
                "destination_name": destination.get("name", "Destino"),
                "city": destination.get("city", "Destino"),
                "is_company": destination.get("is_company", False),
                "is_approximate": destination.get("is_approximate", False),
                "distance_meters": round(distance_meters),
                "distance_km": round(distance_meters / 1000.0, 1),
            },
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates,
            },
        }


# Instância global do roteador singleton
router_instance = RoadRouter()

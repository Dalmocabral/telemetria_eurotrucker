/**
 * Banco de Dados de Pontos de Referência (POIs), Cidades e Radares do Euro Truck Simulator 2.
 * Coordenadas reais mapeadas no sistema métrico do ETS2 (X, Z).
 */

// Principais Cidades do ETS2
export const ETS2_CITIES = [
  { name: "Paris", country: "França", x: -30842.0, z: 5982.0 },
  { name: "Berlim", country: "Alemanha", x: 10343.0, z: -9903.0 },
  { name: "Londres", country: "Reino Unido", x: -39120.0, z: -15230.0 },
  { name: "Amsterdã", country: "Holanda", x: -18598.0, z: -11736.0 },
  { name: "Bruxelas", country: "Bélgica", x: -21215.0, z: -5293.0 },
  { name: "Frankfurt", country: "Alemanha", x: -7430.0, z: 2280.0 },
  { name: "Munique", country: "Alemanha", x: 4210.0, z: 15820.0 },
  { name: "Praga", country: "República Tcheca", x: 17290.0, z: 7480.0 },
  { name: "Viena", country: "Áustria", x: 25140.0, z: 16890.0 },
  { name: "Varsóvia", country: "Polônia", x: 38920.0, z: -6810.0 },
  { name: "Lyon", country: "França", x: -23850.0, z: 25480.0 },
  { name: "Marselha", country: "França", x: -21500.0, z: 38400.0 },
  { name: "Milão", country: "Itália", x: -2800.0, z: 27900.0 },
  { name: "Roma", country: "Itália", x: 4100.0, z: 42100.0 },
  { name: "Barcelona", country: "Espanha", x: -38510.0, z: 49926.0 },
  { name: "Madri", country: "Espanha", x: -55400.0, z: 52100.0 },
  { name: "Hamburgo", country: "Alemanha", x: 2450.0, z: -20100.0 },
  { name: "Roterdã", country: "Holanda", x: -20100.0, z: -9200.0 },
  { name: "Colônia (Köln)", country: "Alemanha", x: -12800.0, z: -2200.0 },
  { name: "Zurique", country: "Suíça", x: -6800.0, z: 20200.0 },
  { name: "Berna", country: "Suíça", x: -12730.0, z: 20130.0 },
  { name: "Estrasburgo", country: "França", x: -14500.0, z: 12100.0 },
  { name: "Calais", country: "França", x: -30200.0, z: -10800.0 },
  { name: "Dover", country: "Reino Unido", x: -33400.0, z: -12900.0 },
];

// Radares Fixos de Velocidade (Speed Cameras) nas principais rodovias do jogo
export const ETS2_SPEED_CAMERAS = [
  // França - Rodovias A1, A6, A7, A10
  { id: "cam-fr-1", name: "Radar A1 (Paris - Lille)", limit: 90, x: -30500.0, z: -2100.0 },
  { id: "cam-fr-2", name: "Radar A6 (Paris - Lyon)", limit: 90, x: -27200.0, z: 15400.0 },
  { id: "cam-fr-3", name: "Radar A7 (Lyon - Marselha)", limit: 90, x: -22800.0, z: 31200.0 },
  { id: "cam-fr-4", name: "Radar A10 (Paris - Bordeaux)", limit: 90, x: -38200.0, z: 18500.0 },
  { id: "cam-fr-5", name: "Radar A4 (Paris - Reims)", limit: 80, x: -24100.0, z: 4800.0 },
  { id: "cam-fr-6", name: "Radar Calais Porto", limit: 50, x: -30150.0, z: -10750.0 },

  // Alemanha - Zonas de Obras e Cruzamentos com radar
  { id: "cam-de-1", name: "Radar A2 (Hannover - Berlim)", limit: 80, x: -1200.0, z: -11500.0 },
  { id: "cam-de-2", name: "Radar A3 (Colônia - Frankfurt)", limit: 80, x: -9800.0, z: -300.0 },
  { id: "cam-de-3", name: "Radar A7 (Kassel - Würzburg)", limit: 80, x: -3100.0, z: 6200.0 },
  { id: "cam-de-4", name: "Radar A9 (Nürnberg - Munique)", limit: 80, x: 2200.0, z: 11800.0 },
  { id: "cam-de-5", name: "Radar A1 (Bremen - Hamburgo)", limit: 80, x: -2100.0, z: -17500.0 },

  // Reino Unido - Rodovias M25, M1, M6
  { id: "cam-uk-1", name: "Radar M25 Orbital Londres", limit: 80, x: -38500.0, z: -14200.0 },
  { id: "cam-uk-2", name: "Radar M1 (Londres - Birmingham)", limit: 80, x: -42100.0, z: -18200.0 },
  { id: "cam-uk-3", name: "Radar M20 (Dover - Londres)", limit: 80, x: -35200.0, z: -13800.0 },
  { id: "cam-uk-4", name: "Radar A1(M) North", limit: 80, x: -40200.0, z: -27400.0 },

  // Polônia - Rodovias A2, A4
  { id: "cam-pl-1", name: "Radar A2 (Poznan - Varsóvia)", limit: 80, x: 27500.0, z: -7900.0 },
  { id: "cam-pl-2", name: "Radar A4 (Wroclaw - Katowice)", limit: 80, x: 25800.0, z: 3200.0 },

  // Áustria e Suíça - Túneis e Rodovias Alpinas
  { id: "cam-ch-1", name: "Radar A2 Túnel Gotthard", limit: 80, x: -7500.0, z: 23800.0 },
  { id: "cam-at-1", name: "Radar A10 Tauern", limit: 80, x: 16200.0, z: 19800.0 },
  { id: "cam-at-2", name: "Radar A12 Innsbruck", limit: 80, x: 3800.0, z: 20500.0 },

  // Itália - Rodovia A1 del Sole
  { id: "cam-it-1", name: "Radar A1 (Milão - Bolonha)", limit: 80, x: 1200.0, z: 31200.0 },
  { id: "cam-it-2", name: "Radar A1 (Florença - Roma)", limit: 80, x: 3500.0, z: 38900.0 },
];

// Postos de Combustível Estratégicos (Gas Stations)
export const ETS2_GAS_STATIONS = [
  { id: "gas-1", name: "Posto Shell A1", brand: "Shell", x: -28900.0, z: 4200.0 },
  { id: "gas-2", name: "Posto Total A6", brand: "Total", x: -25800.0, z: 18200.0 },
  { id: "gas-3", name: "Posto Aral A3", brand: "Aral", x: -8400.0, z: 1100.0 },
  { id: "gas-4", name: "Posto BP M1", brand: "BP", x: -41500.0, z: -17800.0 },
  { id: "gas-5", name: "Posto Orlen A2", brand: "Orlen", x: 29100.0, z: -7600.0 },
  { id: "gas-6", name: "Posto Eni A1", brand: "Eni", x: 1800.0, z: 33400.0 },
  { id: "gas-7", name: "Posto Repsol A2", brand: "Repsol", x: -48200.0, z: 51200.0 },
  { id: "gas-8", name: "Posto OMV A1", brand: "OMV", x: 21400.0, z: 17200.0 },
  { id: "gas-9", name: "Posto Esso A4", brand: "Esso", x: -35400.0, z: 6100.0 },
  { id: "gas-10", name: "Posto Avia A7", brand: "Avia", x: -22400.0, z: 33200.0 },
];

// Áreas de Descanso / Cama (Rest Stops / Hotels)
export const ETS2_REST_STOPS = [
  { id: "rest-1", name: "Área de Descanso A1 Norte", type: "hotel", x: -29400.0, z: 2100.0 },
  { id: "rest-2", name: "Estacionamento A6 Sul", type: "parking", x: -26100.0, z: 19800.0 },
  { id: "rest-3", name: "Autohof A3 Frankfurt", type: "autohof", x: -7900.0, z: 1800.0 },
  { id: "rest-4", name: "Serviço M1 Moto", type: "hotel", x: -43200.0, z: -19100.0 },
  { id: "rest-5", name: "Descanso Alpin Gotthard", type: "parking", x: -7800.0, z: 24200.0 },
  { id: "rest-6", name: "Pátio de Descanso A4 Polônia", type: "parking", x: 27100.0, z: 2900.0 },
];

// Praças de Pedágio (Tolls / Péage / Barriera)
export const ETS2_TOLLS = [
  { id: "toll-1", name: "Péage A1 Senlis", cost: "€18", x: -30100.0, z: 2800.0 },
  { id: "toll-2", name: "Péage A6 Fleury", cost: "€24", x: -29200.0, z: 9800.0 },
  { id: "toll-3", name: "Péage A7 Vienne", cost: "€22", x: -23100.0, z: 28400.0 },
  { id: "toll-4", name: "Péage A10 Saint-Arnoult", cost: "€28", x: -33200.0, z: 9100.0 },
  { id: "toll-5", name: "Barriera Milano Nord", cost: "€16", x: -2900.0, z: 26800.0 },
  { id: "toll-6", name: "Barriera Roma Nord", cost: "€22", x: 3800.0, z: 39900.0 },
  { id: "toll-7", name: "Pedágio A2 Nowy Tomysl", cost: "18 PLN", x: 22400.0, z: -8100.0 },
];

// Fronteiras e Portos (Borders & Ferry Terminals)
export const ETS2_BORDERS = [
  { id: "border-1", name: "Eurotunnel Calais (Trem)", type: "train", x: -30300.0, z: -11200.0 },
  { id: "border-2", name: "Porto de Calais (Balsa)", type: "ferry", x: -29900.0, z: -10500.0 },
  { id: "border-3", name: "Porto de Dover (Balsa)", type: "ferry", x: -33200.0, z: -12800.0 },
  { id: "border-4", name: "Fronteira França - Suíça (Basel)", type: "customs", x: -11900.0, z: 16800.0 },
  { id: "border-5", name: "Fronteira Alemanha - Áustria (Salzburg)", type: "open", x: 12200.0, z: 17100.0 },
  { id: "border-6", name: "Fronteira Alemanha - Polônia (Frankfurt Oder)", type: "open", x: 21900.0, z: -8900.0 },
];

import SkinDefault from './SkinDefault';
import SkinAeroDual from './SkinAeroDual';
import SkinRouteNavigator from './SkinRouteNavigator';
import SkinCarbonClassic from './SkinCarbonClassic';
import SkinSportRed from './SkinSportRed';
import SkinCobaltLuxury from './SkinCobaltLuxury';
import SkinScaniaV8 from './SkinScaniaV8';
import SkinVolvoFH from './SkinVolvoFH';
import SkinCyberpunk from './SkinCyberpunk';
import SkinActros from './SkinActros';
import SkinManTGX from './SkinManTGX';

export const CLUSTER_SKINS = [
  {
    id: 'default',
    number: 0,
    name: 'Padrão ETS2 Pro',
    category: 'Padrão',
    description: 'Painel original limpo com velocímetro gigante, RPM e medidor analógico.',
    accentColor: '#00e5ff',
    Component: SkinDefault,
  },
  {
    id: 'model1_aero_dual',
    number: 1,
    name: '1. Aero Dual Minimal (Foto 1)',
    category: 'Foto',
    description: 'Cluster duplo em ciano e verde, arco de cruzeiro e relógio hexagonal.',
    accentColor: '#38bdf8',
    Component: SkinAeroDual,
  },
  {
    id: 'model2_route_nav',
    number: 2,
    name: '2. Route Navigator (Foto 2)',
    category: 'Foto',
    description: 'Ponteiros analógicos vermelhos com mini-mapa esquemático de rota no centro.',
    accentColor: '#ff4d4f',
    Component: SkinRouteNavigator,
  },
  {
    id: 'model3_carbon_classic',
    number: 3,
    name: '3. Carbon Sport 4-Gauge (Foto 3)',
    category: 'Foto',
    description: 'Acabamento em fibra de carbono, 4 relógios analógicos com agulhas azuis e LEDs de serviço.',
    accentColor: '#00e5ff',
    Component: SkinCarbonClassic,
  },
  {
    id: 'model4_sport_red',
    number: 4,
    name: '4. Sport Red Racing (Foto 4)',
    category: 'Foto',
    description: 'Cockpit noturno esportivo em vermelho vibrante com seletor de marchas PRND vertical.',
    accentColor: '#ef4444',
    Component: SkinSportRed,
  },
  {
    id: 'model5_cobalt_luxury',
    number: 5,
    name: '5. Cobalt Luxury Blue (Foto 5)',
    category: 'Foto',
    description: 'Mostradores de alta definição com gradiente azul cobalto e réguas de diagnóstico.',
    accentColor: '#2563eb',
    Component: SkinCobaltLuxury,
  },
  {
    id: 'model6_scania_v8',
    number: 6,
    name: '6. Scania V8 King',
    category: 'Caminhão',
    description: 'Titânio escovado, biséis octogonais dourados, manômetros duplos de ar e Opticruise.',
    accentColor: '#eab308',
    Component: SkinScaniaV8,
  },
  {
    id: 'model7_volvo_fh',
    number: 7,
    name: '7. Volvo FH Globetrotter',
    category: 'Caminhão',
    description: 'Design escandinavo cristalino com silhueta do caminhão e indicadores I-Shift / VEB+.',
    accentColor: '#22d3ee',
    Component: SkinVolvoFH,
  },
  {
    id: 'model8_cyberpunk',
    number: 8,
    name: '8. Cyberpunk 2077 Synthwave',
    category: 'Futurista',
    description: 'Neon magenta e ciano elétrico com grade synthwave e segmentos LED de rotação.',
    accentColor: '#f43f5e',
    Component: SkinCyberpunk,
  },
  {
    id: 'model9_actros',
    number: 9,
    name: '9. Mercedes Actros Multimedia',
    category: 'Caminhão',
    description: 'Cockpit panorâmico em platina com assistente de faixa Active Drive Assist e Powershift 3.',
    accentColor: '#94a3b8',
    Component: SkinActros,
  },
  {
    id: 'model10_man_tgx',
    number: 10,
    name: '10. MAN TGX Bavarian Lion',
    category: 'Caminhão',
    description: 'Iluminação âmbar clássica da Baviera, faixa verde de torque D38 e manômetros de ar pesados.',
    accentColor: '#f97316',
    Component: SkinManTGX,
  },
];

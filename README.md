# 🚛 TruckPilot Pro — Telemetria, GPS Vetorial 3D & Cockpit Digital (ETS2)

<p align="center">
  <img src="https://img.shields.io/badge/Status-Est%C3%A1vel%20v1.0.0-00e5ff?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Jogo-Euro%20Truck%20Simulator%202-ff5722?style=for-the-badge&logo=steam" alt="ETS2" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61dafb?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Backend-Python%20FastAPI%20%7C%20WebSockets-3776ab?style=for-the-badge&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Mapas-MapLibre%20GL%203D-ff4081?style=for-the-badge&logo=mapbox" alt="MapLibre" />
  <img src="https://img.shields.io/badge/Desktop-CustomTkinter%20GUI-10b981?style=for-the-badge" alt="Desktop GUI" />
</p>

O **TruckPilot Pro** é uma central de comando e telemetria automotiva de última geração para o simulador **Euro Truck Simulator 2 (ETS2)**. Ele transforma qualquer smartphone, tablet ou monitor secundário conectado ao Wi-Fi em um cockpit profissional de caminhão, com navegação GPS vetorial 3D em tempo real, alertas sonoros de radar por voz, comandos virtuais do caminhão e **10 modelos de painéis digitais customizáveis**.

---

## 📊 Infograma da Arquitetura do Sistema

```mermaid
flowchart TB
    subgraph JOGO["🎮 Euro Truck Simulator 2 (PC)"]
        ETS2["Processo eurotrucks2.exe"]
        DLL["scs-telemetry.dll\n(Plugin SCS de Telemetria)"]
        SHM[("Memória Compartilhada do Windows\nLocal\\ets2simDashboardTelemetryV2")]
        ETS2 -->|Exporta Física, Luzes e Coordenadas| DLL
        DLL -->|Grava a 60 FPS| SHM
    end

    subgraph BACKEND["⚡ TruckPilot Server & Desktop GUI (Python)"]
        READER["ETS2Reader\n(Leitura de Memória Ctypes)"]
        GUI["Painel Desktop Windows\n(CustomTkinter + QR Code)"]
        FASTAPI["Servidor Web FastAPI\n(Porta 8000)"]
        WS["WebSocket Broadcaster\n(Broadcast a 30 FPS / 33ms)"]
        KEY["KeySender\n(Ctypes SendInput p/ Teclado)"]

        SHM -->|Lê Estrutura Binária| READER
        READER --> WS
        GUI <-->|Controla Servidor e Monitora Rede| FASTAPI
        FASTAPI --> WS
        WS <-->|Comandos de Ações Virtuais| KEY
        KEY -.->|Simula Teclas E, L, K, F, P, C, Espaço| ETS2
    end

    subgraph DISPOSITIVOS["📱 Dispositivos Conectados (Wi-Fi / Rede Local)"]
        direction LR
        TABLET["Tablet / Celular 1\n(Modo GPS 3D Vetorial)"]
        PHONE["Celular 2\n(Modo Painel: 10 Modelos)"]
        SPLIT["Tablet / PC Secundário\n(Modo Misto: GPS + Painel)"]
    end

    WS ===|Streaming JSON em Tempo Real| DISPOSITIVOS

    subgraph CLIENT_FE["💻 Aplicação Web Automotiva (React 19 + MapLibre)"]
        RADAR["Sistema de Radar Antecipado\n(Voz PT-BR + Contagem Regressiva em Metros)"]
        SKINS["Seletor de 10 Cockpits\n(5 Modelos Fotos + 5 Caminhões Modernos)"]
        MAP_ENGINE["Motor MapLibre GL\n(Rotas, Câmera Dinâmica e Pontos de Entrega)"]
        WAKE_LOCK["Wake Lock API\n(Mantém a Tela do Tablet Sempre Acesa)"]
    end

    DISPOSITIVOS --- CLIENT_FE
```

---

## 📱 Fluxo do Usuário (Do PC ao Tablet)

```mermaid
sequenceDiagram
    autonumber
    actor Piloto as 🚛 Motorista (Você)
    participant Desktop as 🖥️ TruckPilot Desktop GUI
    participant Celular as 📱 Tablet / Smartphone
    participant Jogo as 🎮 Euro Truck Simulator 2

    Piloto->>Desktop: Executa 'iniciar_servidor.bat'
    Desktop->>Desktop: Inicia Servidor FastAPI + Gera QR Code em alta definição
    Piloto->>Celular: Conecta no mesmo Wi-Fi e aponta a câmera para o QR Code
    Celular->>Desktop: Abre a aplicação web (sem instalar nenhum aplicativo!)
    Celular->>Celular: Ativa 'Wake Lock' (a tela não desliga durante a viagem)
    Piloto->>Jogo: Inicia a viagem com seu caminhão
    Jogo->>Desktop: scs-telemetry.dll envia dados para a memória compartilhada
    Desktop->>Celular: WebSocket envia velocidade, marcha, combustível, danos e rota a 30 FPS
    Celular-->>Piloto: Alerta de voz: "Atenção: radar de velocidade à frente a 500 metros"
    Piloto->>Celular: Toca no botão da tela para ligar faróis ou motor
    Celular->>Desktop: WebSocket envia ação 'light' ou 'engine'
    Desktop->>Jogo: Ctypes simula pressionamento físico da tecla correspondente
```

---

## ✨ Principais Funcionalidades

### 1. 🎨 10 Modelos de Painel Exclusivos (Modo Painel)
O usuário pode escolher seu estilo preferido através do botão seletor flutuante `🎨 Modelo`:
- **Modelos Inspirados nas Fotos de Referência:**
  - 🥇 **Modelo 1 — Aero Dual Minimal:** Cluster duplo elegante em ciano e verde, arco de velocidade de cruzeiro e relógio hexagonal.
  - 🥈 **Modelo 2 — Route Navigator:** Ponteiros analógicos esportivos vermelhos com mini-mapa esquemático de rota no centro.
  - 🥉 **Modelo 3 — Carbon Sport 4-Gauge:** Textura em fibra de carbono escura, 4 manômetros circulares analógicos com agulhas azuis e régua de inspeção de LEDs.
  - 🏅 **Modelo 4 — Sport Red Racing:** Cockpit noturno agressivo em vermelho vibrante, mostrador circular de limite da rodovia e seletor vertical PRND.
  - 💎 **Modelo 5 — Cobalt Luxury Edition:** Degradê azul cobalto premium, mostradores digitais de combustível/temperatura e luzes espias centrais.
- **Modelos Adicionais de Caminhões Modernos:**
  - 🦁 **Modelo 6 — Scania NextGen V8 Titanium:** Molduras octogonais, acabamento titânio com dourado, coroa V8 e manômetros duplos de pressão pneumática de ar (*Bar 1* e *Bar 2*).
  - 🇸🇪 **Modelo 7 — Volvo FH Globetrotter:** Estilo minimalista escandinavo em turquesa, I-Shift dinâmico e freio-motor VEB+.
  - 🌆 **Modelo 8 — Cyberpunk 2077 HUD Neon:** Estética Synthwave com malha em perspectiva 3D, barras segmentadas de LED e cores neon magenta/ciano.
  - ⭐ **Modelo 9 — Mercedes-Benz Actros Multimedia Cockpit:** Painel widescreen digital em cinza platina com assistente de condução ADAS e barras dinâmicas.
  - 🐻 **Modelo 10 — MAN TGX Bavarian Amber:** Iluminação âmbar clássica alemã, faixa de torque verde do motor D38 (1000–1400 RPM) e duplo circuito de freio a ar.
- **Painel Padrão Pro:** Mantido para o **Modo Misto** (tela dividida com o GPS) para máxima legibilidade.

---

### 2. 🚨 Detector Antecipado de Radares (Com Voz e Distância em Metros)
- Funciona tanto no **Modo GPS** quanto no **Modo Painel**.
- Detecta o radar de velocidade mais próximo pela malha de coordenadas do ETS2.
- A até **650 metros**, abre um card de alerta piscante na tela com a velocidade máxima da via e a **contagem regressiva metro a metro**.
- **Aviso Sonoro por Voz (PT-BR):** Fala automaticamente pelos alto-falantes do tablet/celular:
  > *"Atenção: radar de velocidade à frente a 500 metros. Limite de 80 km/h."*

---

### 3. 🗺️ GPS Vetorial 3D e Roteamento Rodoviário Real (MapLibre GL + A*)
- **Rotas Reais pelas Rodovias do ETS2:** Substitui a linha reta direta por um roteador de alta velocidade com algoritmo A* executado diretamente sobre as estradas do jogo.
- **Malha Viária Baseada no Jogo:** Utiliza a rede viária oficial extraída dos setores do ETS2 (`graph.bin` com 349.091 arestas e `geometry.bin` com 7,86 milhões de pontos de coordenadas, originários do ecossistema comunitário *TruckNav-Sim* e *ts-map*, sob licença GPL-3.0/MIT).
- **Encaixe Inteligente (Map-Matching):** Encaixa o caminhão na rodovia mais próxima com limite seguro de distância (evita trajetos anômalos em balsas, trens ou áreas não mapeadas).
- **Destino Preciso por Empresa ou Cidade:** Resolve automaticamente o pátio da empresa de entrega (`companies.geojson` com normalização de nomes/mods). Se a empresa não for identificada, utiliza o centro da cidade de destino com aviso explícito de `(Destino aproximado)`.
- **Camadas GeoJSON Distintas:** A rota planejada é exibida em ciano brilhante com traçado de curvas de alta resolução, visualmente separada do rastro em âmbar do percurso já percorrido pelo caminhão.
- **Instruções de Manobra Reais:** Gera avisos de curva e direção baseados nos ângulos reais das estradas e ramificações.
- **Recálculo Inteligente com Throttling:** Atualiza a rota com limitação temporal e detecção de desvio de rota (>350m por 3 leituras consecutivas), sem consumir CPU nos 30 FPS do WebSocket.

---

### 4. 📱 Tela Sempre Ativa Honesta (Wake Lock & Suporte HTTPS)
- **Diagnóstico Transparente e Sem Falsos Positivos:** NUNCA exibe "Tela Ativa" sem confirmação real da API do navegador ou do player auxiliar.
- **Estados Visíveis:**
  - 🟢 **Tela Ativa (API Nativa):** W3C Screen Wake Lock concedido em contexto seguro.
  - 🟣 **Tela Ativa (Vídeo Auxiliar):** Mantida acesa por reprodução de micro-vídeo mudo em segundo plano (ativado por toque do usuário).
  - 🟡 **Inseguro (HTTP):** Alerta claro de que o navegador bloqueia a API nativa fora do `localhost` em conexões HTTP normais.
  - 🔴 **Permissão Negada:** Informa recusa pelo sistema ou modo de economia extrema de bateria.
  - ⚪ **Liberado pelo Sistema / Desativado pelo Usuário:** Gerenciamento com reaquisição automática no retorno de visibilidade da aba (`visibilitychange`).
- **Suporte a HTTPS Local:** Inclui gerador de certificados TLS locais (`python server/generate_cert.py`) com nomes alternativos (SAN) para o IP local do PC, permitindo usar a Screen Wake Lock API nativa diretamente no tablet.

---

### 5. 🕹️ Controle Remoto do Caminhão (Botões de Ação na Tela)
Comande o caminhão diretamente pelo tablet ou celular através de toques na tela com feedback tátil de vibração:
- **Ligar/Desligar Motor** (Tecla `E`)
- **Farol Baixo** (Tecla `L`)
- **Farol Alto** (Tecla `K`)
- **Pisca-Alerta** (Tecla `F`)
- **Freio de Estacionamento** (Tecla `Espaço`)
- **Limpador de Parabrisa** (Tecla `P`)
- **Piloto Automático / Cruise Control** (Tecla `C`)

---

### 6. 🖥️ Painel Desktop Windows (CustomTkinter GUI)
- **QR Code Automático:** Basta apontar a câmera do celular para abrir sem digitar nenhum IP.
- **Botão "Liberar no Firewall":** Adiciona as regras necessárias no Windows Defender Firewall em 1 clique.
- **Auto-Kill de Processos Zumbis:** Elimina conflitos de porta (`Errno 10048`), liberando a porta 8000 automaticamente.
- **Monitor de Conexão:** Mostra instantaneamente se o ETS2 está aberto ou se está em modo demonstração.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- **Windows 10 ou 11 (64-bit)**
- **Python 3.10+** instalado
- **Euro Truck Simulator 2** com o plugin de telemetria `scs-telemetry.dll`

### 1. Instalar o Plugin no Jogo (Apenas 1 vez)
Copie o arquivo `scs-telemetry.dll` para a pasta de plugins do ETS2:
```
C:\Program Files (x86)\Steam\steamapps\common\Euro Truck Simulator 2\bin\win_x64\plugins\scs-telemetry.dll
```
*(Caso a pasta `plugins` não exista, basta criá-la).*

### 2. Iniciar o Servidor
Dê um duplo clique no arquivo:
👉 **`iniciar_servidor.bat`**

A janela gráfica moderna do **TruckPilot Pro** será aberta com o **QR Code**.

### 3. Conectar Celulares ou Tablets
1. Certifique-se de que o computador e o tablet/celular estão conectados na **mesma rede Wi-Fi**.
2. Aponte a câmera do aparelho para o QR Code da tela do computador (ou digite o endereço exibido, ex: `http://192.168.1.12:8000`).
3. Toque em **[ Tela Cheia ]** no navegador e escolha a visão desejada:
   - **Painel:** Escolha entre os 10 modelos visuais disponíveis.
   - **GPS:** Mapa 3D vetorial em tempo real com rota calculada pelas estradas e alertas de radares.
   - **Misto:** Painel e mapa divididos lado a lado na mesma tela.

### 4. (Opcional) Ativar HTTPS para Wake Lock Nativo no Tablet
Para habilitar a Screen Wake Lock API nativa em dispositivos móveis na rede local:
```bash
python server/generate_cert.py
python server/main.py --ssl
```
Acesse `https://IP-DO-SEU-PC:8443` no tablet e aceite o certificado local autoassinado.

---

## 🛠️ Ambiente de Desenvolvimento & Compilação

### Rodar em Modo de Desenvolvimento (Live Reload)
Execute o arquivo:
```cmd
iniciar_desenvolvimento.bat
```
- Servidor Python ativo na porta `8000`
- Frontend React (Vite) com Hot Reload ativo na porta `5173`

### Compilar o Frontend
```bash
cd client
npm install
npm run build
```

### Gerar Executável Independente (.exe para Windows)
Para distribuir para amigos sem que precisem de Python ou Node.js:
```bash
python build_exe.py
```
O executável portátil será empacotado na pasta `dist/ETS2_Telemetria_Pro/`.

---

## 📂 Estrutura do Repositório

```plaintext
telemetria_eurotrucker/
├── client/                      # Frontend Web Automotivo (React 19 + Vite)
│   ├── public/                  # Mapas vetoriais ETS2, glifos e ícones
│   ├── src/
│   │   ├── components/
│   │   │   ├── skins/           # Os 10 Modelos / Skins de Cockpit
│   │   │   │   ├── SkinAeroDual.jsx
│   │   │   │   ├── SkinRouteNavigator.jsx
│   │   │   │   ├── SkinCarbonClassic.jsx
│   │   │   │   ├── SkinSportRed.jsx
│   │   │   │   ├── SkinCobaltLuxury.jsx
│   │   │   │   ├── SkinScaniaV8.jsx
│   │   │   │   ├── SkinVolvoFH.jsx
│   │   │   │   ├── SkinCyberpunk.jsx
│   │   │   │   ├── SkinActros.jsx
│   │   │   │   ├── SkinManTGX.jsx
│   │   │   │   └── index.js
│   │   │   ├── GpsView.jsx      # GPS 3D Vetorial (MapLibre GL)
│   │   │   ├── SpeedometerView.jsx # Painel com Seletor de Skins e Botões
│   │   │   └── SplitView.jsx    # Modo Misto Dividido
│   │   ├── utils/
│   │   │   ├── useRadarWarning.js # Hook compartilhado de radar com voz
│   │   │   └── wakeLock.js      # Gerenciamento de tela sempre ativa
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── skins.css            # Estilos refinados de todos os 10 modelos
├── server/                      # Servidor Backend em Python
│   ├── ets2_reader.py           # Leitura da Memória Compartilhada do ETS2
│   ├── router.py                # Roteador A*, malha viária e resolução de empresas
│   ├── generate_cert.py         # Gerador de certificados TLS locais (SAN)
│   ├── key_sender.py            # Simulação de teclas no Windows (ctypes)
│   ├── main.py                  # API FastAPI, WebSockets e servidor de estáticos
│   └── gui.py                   # Interface Gráfica Desktop (CustomTkinter)
├── tests/                       # Suíte de Testes Automatizados
│   ├── test_router.py           # Testes unitários do A*, snapping e telemetria
│   └── test_wake_lock.js        # Testes unitários do gerenciador de Wake Lock
├── build_exe.py                 # Script de empacotamento com PyInstaller
├── iniciar_servidor.bat         # Inicializador rápido de 1 clique
├── iniciar_desenvolvimento.bat  # Ambiente integrado de desenvolvimento
├── liberar_firewall.bat         # Desbloqueio automático de rede no Windows
└── README.md                    # Documentação completa do projeto
```

---

## 🧪 Testes Automatizados

O projeto inclui uma suíte completa de testes para garantir a robustez do roteamento e do gerenciamento de energia:

### 1. Testes do Roteador Rodoviário (Python):
```bash
python -m unittest tests/test_router.py
```
- Validação de conversão bidirecional de coordenadas (ETS2 <-> WGS84 Mercator).
- Carregamento de nós, arestas e geometria contínua de curvas (`geometry.bin`).
- Execução do A* em grafo sintético e na malha viária real de Paris a Lille.
- Encaixe espacial (map-matching) do caminhão e empresas com limites de distância.
- Fallback seguro para centro da cidade explicitamente marcado como `(Destino aproximado)`.
- Tratamento de nós desconectados e telemetria simulada ponta-a-ponta.

### 2. Testes da Tela Sempre Ativa (Node.js):
```bash
node --test tests/test_wake_lock.js
```
- Aquisição da W3C Screen Wake Lock API nativa em contexto seguro.
- Diagnóstico honesto de conexões HTTP locais (`UNAVAILABLE_HTTP`).
- Fallback auxiliar de micro-vídeo com consentimento do usuário (`ACTIVE_MEDIA`).
- Liberação pelo sistema operacional (`RELEASED`) e reaquisição no foco (`visibilitychange`).
- Desativação pelo usuário e bloqueio de reativação indevida (`DISABLED`).

### 3. Lint e Build do Frontend:
```bash
cd client
npm run lint
npm run build
```

---

## ⚠️ Limitações Conhecidas

1. **Mapas Modificados (ProMods, EAA, Rotas Brasil, etc.):**
   - A malha viária oficial binária incluída no projeto abrange o mapa base oficial da SCS Software e DLCs europeias principais.
   - Em estradas exclusivas de mapas modificados não catalogados, o roteador detectará que o caminhão ou destino está fora da rede mapeada (`START_OFF_ROAD` ou `DEST_NOT_SNAPPED`) e exibirá um aviso transparente no painel em vez de inventar rotas fictícias.

2. **Políticas de Wake Lock em HTTP Local:**
   - Em conexões `http://IP:8000`, navegadores baseados em Chromium e WebKit bloqueiam a Screen Wake Lock API nativa por exigência do W3C de Contexto Seguro (HTTPS).
   - O TruckPilot Pro fornece diagnóstico honesto dessa restrição e disponibiliza como alternativa opcional o micro-vídeo auxiliar acionado por toque ou a inicialização segura com certificados TLS locais (`python server/generate_cert.py` e `python server/main.py --ssl`).

---

## 📜 Licença e Créditos
- Desenvolvido para a comunidade de simuladores de caminhão (**Euro Truck Simulator 2 / SCS Software**).
- Dados de telemetria fornecidos pelo plugin comunitário `scs-telemetry`.
- Cartografia vetorial e malha viária derivadas dos projetos de código aberto comunitários `TruckNav-Sim` (Rares-Muntean) e `ts-map` (dariowouters), sob licenças GNU GPL v3.0 e MIT.


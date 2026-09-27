# TruckPilot Pro — Plugin Nativo do TruckersMP Client SDK

Este plugin nativo em C++17 é carregado pelo cliente oficial do **TruckersMP** e transmite a posição, velocidade, orientação e nome dos jogadores próximos em tempo real para o servidor **TruckPilot Pro** através de Memória Compartilhada do Windows de alta performance (`Local\TruckersMPTelemetry`).

---

## 🏗️ Requisitos para Compilação

1. **Windows 10 ou 11 (x64)**
2. **Visual Studio 2019, 2022 ou Build Tools** (com suporte a C++17)
3. **CMake 3.20 ou superior**
4. **TruckersMP Client SDK Headers**:
   Clone o repositório oficial do SDK dentro desta pasta:
   ```powershell
   cd plugins/truckersmp
   git clone https://github.com/TruckersMP/GameClientSDK.git
   ```

---

## ⚡ Como Compilar

Execute os comandos abaixo no terminal do Windows (PowerShell / Developer Command Prompt):

```powershell
# 1. Gerar os arquivos de projeto do CMake (Windows x64)
cmake -B build -A x64

# 2. Compilar em modo Release
cmake --build build --config Release
```

A DLL gerada estará localizada em:
`build/Release/truckpilot_tmp.dll`

---

## 🚚 Como Instalar no Jogo

Copie a DLL compilada `truckpilot_tmp.dll` para a pasta de plugins do Euro Truck Simulator 2:

```text
C:\Arquivos de Programas (x86)\Steam\steamapps\common\Euro Truck Simulator 2\bin\win_x64\plugins\truckpilot_tmp.dll
```

> **Dica:** Se a pasta `plugins` não existir dentro de `bin\win_x64\`, crie-a manualmente.

---

## 🔄 Como Funciona a Comunicação

```text
┌─────────────────────────────────┐
│ Cliente TruckersMP (ETS2 x64)   │
│ └─ truckpilot_tmp.dll (SDK C++) │
└────────────────┬────────────────┘
                 │ Escreve em tempo real (~30 FPS)
                 ▼
┌─────────────────────────────────┐
│ Windows Shared Memory           │
│ (Local\TruckersMPTelemetry)     │
└────────────────┬────────────────┘
                 │ Lê com ctypes/mmap (zero cópia)
                 ▼
┌─────────────────────────────────┐
│ Servidor TruckPilot Pro Python  │
│ (server/truckersmp_bridge.py)   │
└────────────────┬────────────────┘
                 │ Broadcast JSON via WebSocket
                 ▼
┌─────────────────────────────────┐
│ Painel GPS MapLibre GL no Tablet│
│ ├─ Marcadores com orientação    │
│ ├─ Rótulo: [Tag] Nickname       │
│ ├─ Card interativo de detalhes  │
│ └─ Botão de toggle com badge    │
└─────────────────────────────────┘
```

---

## 🧪 Testes e Modo Simulação

Mesmo quando o jogo ou o TruckersMP não estiverem abertos, o servidor do **TruckPilot Pro** ativa automaticamente um **Modo Demonstração Inteligente**, gerando caminhões de teste que trafegam em rotas próximas à posição atual do caminhão.

Você pode ligar ou desligar a visualização dos jogadores no GPS a qualquer momento através do botão **Multiplayer** (ícone de usuários) no canto direito do mapa.

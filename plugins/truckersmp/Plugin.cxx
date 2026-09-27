/**
 * TruckPilot Pro - Plugin Nativo do TruckersMP Client SDK (C++17)
 * Lê jogadores próximos (Streamed-In) e exporta suas coordenadas, orientações,
 * nomes e velocidades para a Memória Compartilhada do Windows (Local\TruckersMPTelemetry).
 */

#include <windows.h>
#include <chrono>
#include <cmath>
#include <cstring>
#include <memory>
#include <string>
#include <vector>
#include <thread>
#include <atomic>

#include <TruckersMP/TruckersMP.hxx>
#include "shared_memory.h"

// Memória Compartilhada do Windows
static HANDLE g_hMapFile = NULL;
static TMPSharedMemory* g_pSharedMem = nullptr;
static std::unique_ptr<TruckersMP::Session> g_session;
static std::atomic<bool> g_running{false};
static std::thread g_workerThread;

// Converte Quaternion para rotação Yaw / Heading em graus (0..360)
static float QuaternionToHeadingDegrees(float qx, float qy, float qz, float qw) {
    // Yaw em torno do eixo Y
    float siny_cosp = 2.0f * (qw * qy + qx * qz);
    float cosy_cosp = 1.0f - 2.0f * (qy * qy + qz * qz);
    float yaw_rad = std::atan2(siny_cosp, cosy_cosp);
    float deg = yaw_rad * (180.0f / 3.14159265358979323846f);
    if (deg < 0.0f) deg += 360.0f;
    return deg;
}

// Loop de atualização de telemetria em segundo plano (~30 Hz)
static void WorkerTelemetryLoop() {
    while (g_running) {
        if (g_session && g_pSharedMem) {
            auto playerModule = g_session->Player();
            auto optLocalPlayer = playerModule.GetLocalPlayer();
            int32_t localId = optLocalPlayer ? optLocalPlayer->GetPlayerID().value_or(0) : 0;

            auto optPlayers = playerModule.GetAllPlayers();
            if (optPlayers) {
                uint32_t count = 0;
                uint64_t nowMs = std::chrono::duration_cast<std::chrono::milliseconds>(
                    std::chrono::system_clock::now().time_since_epoch()
                ).count();

                for (const auto& player : *optPlayers) {
                    if (count >= TMP_MAX_PLAYERS) break;

                    auto optId = player.GetPlayerID();
                    if (!optId || *optId == localId) continue; // Pula o próprio jogador local

                    auto optVehicle = player.GetVehicle();
                    if (!optVehicle) continue;

                    auto optPlacement = optVehicle->GetPlacement();
                    if (!optPlacement) continue;

                    TMPPlayerTelemetry& entry = g_pSharedMem->players[count];
                    entry.id = *optId;

                    // Nome do jogador
                    std::string username = player.GetUsername().value_or("Player");
                    std::strncpy(entry.name, username.c_str(), sizeof(entry.name) - 1);
                    entry.name[sizeof(entry.name) - 1] = '\0';

                    // Tag VTC
                    std::string tag = player.GetTagText().value_or("");
                    std::strncpy(entry.tag, tag.c_str(), sizeof(entry.tag) - 1);
                    entry.tag[sizeof(entry.tag) - 1] = '\0';

                    // Coordenadas mundiais do jogo
                    entry.x = optPlacement->position.x;
                    entry.y = optPlacement->position.y;
                    entry.z = optPlacement->position.z;

                    // Orientação
                    entry.heading = QuaternionToHeadingDegrees(
                        optPlacement->rotation.x,
                        optPlacement->rotation.y,
                        optPlacement->rotation.z,
                        optPlacement->rotation.w
                    );

                    // Velocidade em km/h
                    auto optVel = optVehicle->GetLinearVelocity();
                    if (optVel) {
                        float speedMs = std::sqrt(optVel->x * optVel->x + optVel->z * optVel->z);
                        entry.speed_kmh = speedMs * 3.6f;
                    } else {
                        entry.speed_kmh = 0.0f;
                    }

                    // Distância do jogador local (metros)
                    entry.distance = player.GetDistanceFromLocalPlayer().value_or(0.0f);
                    entry.flags = 0;

                    count++;
                }

                // Atualiza cabeçalho com segurança atômica
                g_pSharedMem->player_count = count;
                g_pSharedMem->local_player_id = localId;
                g_pSharedMem->timestamp = nowMs;
                g_pSharedMem->magic = TMP_TELEMETRY_MAGIC;
                g_pSharedMem->version = TMP_TELEMETRY_VERSION;
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(33)); // ~30 FPS
    }
}

static bool InitSharedMemory() {
    g_hMapFile = CreateFileMappingW(
        INVALID_HANDLE_VALUE,
        NULL,
        PAGE_READWRITE,
        0,
        sizeof(TMPSharedMemory),
        TMP_SHM_NAME
    );

    if (g_hMapFile == NULL) {
        return false;
    }

    g_pSharedMem = (TMPSharedMemory*)MapViewOfFile(
        g_hMapFile,
        FILE_MAP_ALL_ACCESS,
        0,
        0,
        sizeof(TMPSharedMemory)
    );

    if (g_pSharedMem == NULL) {
        CloseHandle(g_hMapFile);
        g_hMapFile = NULL;
        return false;
    }

    std::memset(g_pSharedMem, 0, sizeof(TMPSharedMemory));
    g_pSharedMem->magic = TMP_TELEMETRY_MAGIC;
    g_pSharedMem->version = TMP_TELEMETRY_VERSION;
    return true;
}

static void CloseSharedMemory() {
    if (g_pSharedMem) {
        UnmapViewOfFile(g_pSharedMem);
        g_pSharedMem = nullptr;
    }
    if (g_hMapFile) {
        CloseHandle(g_hMapFile);
        g_hMapFile = NULL;
    }
}

// ---------------------------------------------------------------------------
// PONTOS DE ENTRADA DO TRUCKERSMP CLIENT SDK
// ---------------------------------------------------------------------------

TMP_EXPORT bool TMP_API truckersmp_init(const TruckersMP_Host *host, TruckersMP_PluginDesc *desc) {
    // 1. Identificação do plugin para o cliente TruckersMP
    TruckersMP::PluginInfo info;
    info.m_name = "TruckPilot Pro Telemetry Bridge";
    info.m_author = "TruckPilot Pro";
    info.m_version = "1.0.0";
    info.m_description = "Transmite posições de jogadores próximos para o painel GPS em tempo real.";
    TruckersMP::FillPluginDesc(desc, info);

    // 2. Estabelece a sessão do SDK
    g_session = TruckersMP::Session::Create(host);
    if (!g_session) {
        return false;
    }

    // 3. Inicializa Memória Compartilhada do Windows
    if (!InitSharedMemory()) {
        g_session->Core().LogMessage(TruckersMP::LogLevel::Error, "[TruckPilot] Falha ao criar memoria compartilhada Windows.");
        g_session.reset();
        return false;
    }

    g_session->Core().LogMessage(TruckersMP::LogLevel::Info, "[TruckPilot] Bridge de Telemetria ativada com sucesso!");

    // 4. Inicia thread de atualização de telemetria
    g_running = true;
    g_workerThread = std::thread(WorkerTelemetryLoop);

    return true;
}

TMP_EXPORT void TMP_API truckersmp_shutdown(void) {
    g_running = false;
    if (g_workerThread.joinable()) {
        g_workerThread.join();
    }

    CloseSharedMemory();
    g_session.reset();
}

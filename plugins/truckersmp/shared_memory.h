#pragma once

#include <cstdint>

#define TMP_TELEMETRY_MAGIC 0x544D5031 // "TMP1"
#define TMP_TELEMETRY_VERSION 1
#define TMP_MAX_PLAYERS 128
#define TMP_SHM_NAME L"Local\\TruckersMPTelemetry"

#pragma pack(push, 1)

struct TMPPlayerTelemetry {
    int32_t id;
    char name[64];
    char tag[32];
    double x;
    double y;
    double z;
    float heading;      // Orientação em graus (0..360)
    float speed_kmh;    // Velocidade em km/h
    float distance;     // Distância em metros do jogador local
    uint32_t flags;     // Flags de estado (ex: bit 0 = possui reboque)
};

struct TMPSharedMemory {
    uint32_t magic;           // TMP_TELEMETRY_MAGIC
    uint32_t version;         // TMP_TELEMETRY_VERSION
    uint64_t timestamp;       // Timestamp UNIX em milissegundos
    int32_t local_player_id;  // ID da sessão do jogador local
    uint32_t player_count;    // Quantidade de jogadores próximos válidos
    TMPPlayerTelemetry players[TMP_MAX_PLAYERS];
};

#pragma pack(pop)

cmake_minimum_required(VERSION 3.20)
project(truckpilot_tmp_bridge CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# DLL de 64 bits para o cliente do Euro Truck Simulator 2 / TruckersMP
add_library(truckpilot_tmp SHARED
    Plugin.cxx
    shared_memory.h
)

# Caminho para os cabeçalhos do TruckersMP GameClientSDK
# Espera que o repositório GameClientSDK esteja clonado em GameClientSDK/ ou no caminho especificado
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/GameClientSDK/include")
    target_include_directories(truckpilot_tmp PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/GameClientSDK/include")
else()
    target_include_directories(truckpilot_tmp PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/include")
endif()

target_compile_definitions(truckpilot_tmp PRIVATE
    WIN32_LEAN_AND_MEAN
    NOMINMAX
    _CRT_SECURE_NO_WARNINGS
)

set_target_properties(truckpilot_tmp PROPERTIES
    PREFIX ""
    OUTPUT_NAME "truckpilot_tmp"
)

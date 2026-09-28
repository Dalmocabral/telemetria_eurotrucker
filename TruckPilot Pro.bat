@echo off
chcp 65001 > nul
title TruckPilot Pro - Telemetria & GPS ETS2
pushd "%~dp0server"
echo ============================================================
echo   Iniciando TruckPilot Pro - Telemetria & GPS Cockpit (ETS2)
echo ============================================================
start "" python gui.py

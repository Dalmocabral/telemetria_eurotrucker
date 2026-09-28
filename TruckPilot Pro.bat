@echo off
title TruckPilot Pro - Telemetria & GPS ETS2
cd /d "%~dp0server"
echo ============================================================
echo   Iniciando TruckPilot Pro - Telemetria & GPS Cockpit (ETS2)
echo ============================================================
start "" python gui.py

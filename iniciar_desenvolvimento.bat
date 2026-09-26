@echo off
title ETS2 Telemetria - Modo Desenvolvimento
echo ===================================================
echo     INICIANDO AMBIENTE DE DESENVOLVIMENTO
echo ===================================================
echo.
echo Iniciando Servidor Python na porta 8000...
start "Servidor Python (FastAPI/WebSockets)" cmd /k "cd /d "%~dp0server" && python main.py"

echo Iniciando Frontend React (Vite) na porta 5173...
start "Frontend React (Vite)" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo Os servidores foram abertos em janelas separadas.
echo Acesse no navegador: http://localhost:5173

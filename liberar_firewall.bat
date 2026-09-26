@echo off
title Liberar Porta 8000 no Firewall do Windows
echo ========================================================
echo   CONFIGURANDO FIREWALL DO WINDOWS PARA TELEMETRIA ETS2
echo ========================================================
echo.

:: Verifica se ja possui privilegios de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Solicitando permissao de Administrador do Windows...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~fn0\"\"' -Verb RunAs"
    exit /b
)

echo [+] Liberando a porta 8000 (TCP) no Firewall do Windows...
netsh advfirewall firewall delete rule name="ETS2 Telemetria (Porta 8000)" >nul 2>&1
netsh advfirewall firewall add rule name="ETS2 Telemetria (Porta 8000)" dir=in action=allow protocol=TCP localport=8000 profile=any >nul

echo.
echo ========================================================
echo [OK] SUCESSO! A porta 8000 foi liberada no Firewall.
echo      Seus celulares e tablets agora podem conectar livremente!
echo ========================================================
echo.
pause

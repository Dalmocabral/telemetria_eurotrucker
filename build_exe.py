"""
Script de Compilação para Gerar o Executável Windows (.exe)
Empacota a Interface Gráfica (CustomTkinter), o servidor Python e o Frontend React
em um executável independente profissional.
"""

import os
import subprocess
import sys
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIR = os.path.join(ROOT_DIR, "client")
SERVER_DIR = os.path.join(ROOT_DIR, "server")
DIST_CLIENT = os.path.join(CLIENT_DIR, "dist")

def main():
    print("=" * 60)
    print("   COMPILAÇÃO DO EXECUTÁVEL WINDOWS (ETS2 TELEMETRIA PRO)")
    print("=" * 60)

    # 1. Compilar o Frontend React (Vite)
    print("\n[1/3] Compilando arquivos do React (npm run build)...")
    build_res = subprocess.run("npm run build", shell=True, cwd=CLIENT_DIR)
    if build_res.returncode != 0:
        print("[ERRO] Falha ao compilar o React!")
        sys.exit(1)
    print("[OK] Frontend compilado com sucesso em client/dist.")

    # 2. Executar o PyInstaller
    print("\n[2/3] Empacotando GUI Python, Servidor e Frontend com PyInstaller...")
    
    add_data_flag = f"--add-data={DIST_CLIENT};client/dist"
    
    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name=ETS2_Telemetria_Pro",
        "--onedir",
        "--windowed", # Abre a janela gráfica sem console preto
        "--noconfirm",
        "--collect-all", "customtkinter",
        "--collect-all", "truck_telemetry",
        "--hidden-import", "pydirectinput",
        add_data_flag,
        "--paths", SERVER_DIR,
        os.path.join(SERVER_DIR, "gui.py")
    ]
    
    print("Comando:", " ".join(pyinstaller_cmd))
    res = subprocess.run(pyinstaller_cmd, cwd=ROOT_DIR)
    if res.returncode != 0:
        print("[ERRO] Falha ao executar o PyInstaller!")
        sys.exit(1)

    print("\n[3/3] Compilação concluída com sucesso!")
    print(f"O executável foi gerado na pasta: {os.path.join(ROOT_DIR, 'dist', 'ETS2_Telemetria_Pro')}")
    print("Você pode distribuir essa pasta ou gerar um instalador com o Inno Setup!")
    print("=" * 60)

if __name__ == "__main__":
    main()

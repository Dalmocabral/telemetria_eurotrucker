"""
Interface Gráfica para Desktop (GUI) do ETS2 Telemetria Pro.
Desenvolvida com CustomTkinter para Windows com tema escuro moderno.
Exibe status do servidor, status de conexão com o jogo, contagem de celulares
conectados e um QR Code em alta resolução para conexão instantânea.
"""

import sys
import os

import io

class SafeWriter:
    def __init__(self, log_path=None):
        self.log_path = log_path
    def write(self, s):
        if not s:
            return
        if self.log_path:
            try:
                with open(self.log_path, "a", encoding="utf-8") as f:
                    f.write(s)
            except Exception:
                pass
    def flush(self):
        pass
    def isatty(self):
        return False
    def fileno(self):
        raise io.UnsupportedOperation

# Corrige sys.stdout e sys.stderr sendo None no modo GUI (--windowed) do Windows
base_log_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
_log_file = os.path.join(base_log_dir, "truckpilot_stdout.log")

if sys.stdout is None:
    sys.stdout = SafeWriter(_log_file)
if sys.stderr is None:
    sys.stderr = SafeWriter(_log_file)

import threading
import time
import socket
import webbrowser
import subprocess
import traceback
import tkinter as tk
from tkinter import messagebox
import customtkinter as ctk
import qrcode
from PIL import Image

# Captura qualquer exceção não tratada e grava em arquivo de log
def global_crash_handler(exc_type, exc_value, exc_traceback):
    err = "".join(traceback.format_exception(exc_type, exc_value, exc_traceback))
    base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
    log_file = os.path.join(base_dir, "truckpilot_crash.log")
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] ERRO FATAL:\n{err}\n")
    except Exception:
        pass
    try:
        messagebox.showerror("TruckPilot Pro - Erro", f"Ocorreu um erro ao executar:\n\n{exc_value}\n\nDetalhes gravados em:\n{log_file}")
    except Exception:
        pass

sys.excepthook = global_crash_handler
if hasattr(threading, 'excepthook'):
    threading.excepthook = lambda args: global_crash_handler(args.exc_type, args.exc_value, args.exc_traceback)

# Importa o leitor e as configurações do servidor
from main import app, reader, connected_clients, LOCAL_IP, PORT, free_port
import uvicorn

# Configuração visual do CustomTkinter
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class TelemetryServerApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("🚛 TruckPilot Pro - Telemetria & GPS Cockpit (ETS2)")
        self.geometry("860x580")
        self.minsize(800, 540)
        self.configure(fg_color="#0b0f19")

        # Configura o ícone oficial do TruckPilot Pro na janela e barra de tarefas
        icon_path = None
        if getattr(sys, 'frozen', False):
            meipass = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
            for cand in [
                os.path.join(meipass, "server", "assets", "icon.ico"),
                os.path.join(meipass, "assets", "icon.ico"),
                os.path.join(os.path.dirname(sys.executable), "server", "assets", "icon.ico"),
            ]:
                if os.path.exists(cand):
                    icon_path = cand
                    break
        else:
            cand = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "icon.ico")
            if os.path.exists(cand):
                icon_path = cand

        if icon_path and os.path.exists(icon_path):
            try:
                self.iconbitmap(icon_path)
            except Exception as e:
                print(f"[GUI] Aviso ao carregar iconbitmap: {e}")

        self.server_thread = None
        self.server_instance = None
        self.is_running = True

        # Inicia o servidor em segundo plano
        self.start_background_server()

        # Constrói a interface visual
        self.create_widgets()

        # Inicia o loop de monitoramento da telemetria e clientes
        self.after(1000, self.update_status_loop)

        # Trata o fechamento da janela
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def start_background_server(self):
        """Inicia o servidor Uvicorn em uma thread daemon separada."""
        def run():
            try:
                free_port(PORT)
                config = uvicorn.Config(app=app, host="0.0.0.0", port=PORT, log_level="warning", log_config=None)
                self.server_instance = uvicorn.Server(config)
                self.server_instance.run()
            except Exception as e:
                import traceback
                err = traceback.format_exc()
                base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
                with open(os.path.join(base_dir, "server_thread_error.log"), "a", encoding="utf-8") as f:
                    f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Server Error:\n{err}\n")

        self.server_thread = threading.Thread(target=run, daemon=True)
        self.server_thread.start()

    def create_widgets(self):
        # Grade Principal com 2 colunas
        self.grid_columnconfigure(0, weight=6)
        self.grid_columnconfigure(1, weight=5)
        self.grid_rowconfigure(0, weight=1)

        # ==========================================
        # COLUNA ESQUERDA: STATUS E CONTROLES
        # ==========================================
        left_frame = ctk.CTkFrame(self, fg_color="transparent")
        left_frame.grid(row=0, column=0, padx=(20, 10), pady=20, sticky="nsew")

        # Título do App
        title_label = ctk.CTkLabel(
            left_frame, 
            text="🚛 TRUCKPILOT PRO", 
            font=ctk.CTkFont(family="Segoe UI", size=22, weight="bold"),
            text_color="#00e5ff"
        )
        title_label.pack(anchor="w", pady=(0, 2))

        subtitle_label = ctk.CTkLabel(
            left_frame, 
            text="Servidor de Telemetria e GPS para Celulares e Tablets", 
            font=ctk.CTkFont(family="Segoe UI", size=13),
            text_color="#8a99b5"
        )
        subtitle_label.pack(anchor="w", pady=(0, 16))

        # CARD 1: STATUS DO SERVIDOR
        server_card = ctk.CTkFrame(left_frame, fg_color="#121826", corner_radius=14, border_width=1, border_color="#1f293d")
        server_card.pack(fill="x", pady=(0, 14))

        card_title = ctk.CTkLabel(
            server_card, 
            text="📡 REDE LOCAL & SERVIDOR", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#94a3b8"
        )
        card_title.pack(anchor="w", padx=16, pady=(14, 8))

        # Indicador de Servidor Ativo
        status_row = ctk.CTkFrame(server_card, fg_color="transparent")
        status_row.pack(fill="x", padx=16, pady=(0, 6))

        self.server_badge = ctk.CTkLabel(
            status_row, 
            text="🟢 SERVIDOR ONLINE", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#00e676"
        )
        self.server_badge.pack(side="left")

        # Endereço de acesso
        self.url_label = ctk.CTkLabel(
            server_card, 
            text=f"http://{LOCAL_IP}:{PORT}", 
            font=ctk.CTkFont(family="Consolas", size=15, weight="bold"),
            text_color="#ffffff",
            fg_color="#080b12",
            corner_radius=8,
            padx=12,
            pady=6
        )
        self.url_label.pack(fill="x", padx=16, pady=(0, 10))

        # Contador de Aparelhos Conectados
        self.devices_label = ctk.CTkLabel(
            server_card, 
            text="📱 Nenhum celular conectado no momento", 
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#94a3b8"
        )
        self.devices_label.pack(anchor="w", padx=16, pady=(0, 14))

        # CARD 2: STATUS DO SIMULADOR (ETS2)
        game_card = ctk.CTkFrame(left_frame, fg_color="#121826", corner_radius=14, border_width=1, border_color="#1f293d")
        game_card.pack(fill="x", pady=(0, 16))

        game_title = ctk.CTkLabel(
            game_card, 
            text="🎮 EURO TRUCK SIMULATOR 2", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#94a3b8"
        )
        game_title.pack(anchor="w", padx=16, pady=(14, 8))

        self.game_badge = ctk.CTkLabel(
            game_card, 
            text="🟡 MODO DEMONSTRAÇÃO (Aguardando o jogo abrir...)", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#ffab00"
        )
        self.game_badge.pack(anchor="w", padx=16, pady=(0, 6))

        self.game_desc = ctk.CTkLabel(
            game_card, 
            text="A simulação realista está ativa para você testar os celulares.\nAo abrir o ETS2 com o plugin .dll, a conexão sincroniza ao vivo!", 
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color="#64748b",
            justify="left"
        )
        self.game_desc.pack(anchor="w", padx=16, pady=(0, 14))

        # BOTÕES DE AÇÃO
        btn_frame = ctk.CTkFrame(left_frame, fg_color="transparent")
        btn_frame.pack(fill="x")

        open_browser_btn = ctk.CTkButton(
            btn_frame, 
            text="🌐 Abrir no Navegador deste PC", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            fg_color="#00e5ff",
            text_color="#07090e",
            hover_color="#00b4d8",
            height=38,
            corner_radius=10,
            command=self.open_browser
        )
        open_browser_btn.pack(fill="x", pady=(0, 8))

        firewall_btn = ctk.CTkButton(
            btn_frame, 
            text="🛡️ Liberar no Firewall do Windows (Permitir Celulares)", 
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            fg_color="#1e293b",
            text_color="#38bdf8",
            hover_color="#334155",
            border_width=1,
            border_color="#38bdf8",
            height=36,
            corner_radius=10,
            command=self.unblock_firewall
        )
        firewall_btn.pack(fill="x", pady=(0, 8))

        copy_btn = ctk.CTkButton(
            btn_frame, 
            text="📋 Copiar Endereço IP", 
            font=ctk.CTkFont(family="Segoe UI", size=12),
            fg_color="#161f30",
            text_color="#cbd5e1",
            hover_color="#222f46",
            height=34,
            corner_radius=10,
            command=self.copy_url
        )
        copy_btn.pack(fill="x")

        # ==========================================
        # COLUNA DIREITA: QR CODE E GUIA MOBILE
        # ==========================================
        right_frame = ctk.CTkFrame(self, fg_color="#121826", corner_radius=16, border_width=1, border_color="#1f293d")
        right_frame.grid(row=0, column=1, padx=(10, 20), pady=20, sticky="nsew")

        qr_title = ctk.CTkLabel(
            right_frame, 
            text="📲 CONECTAR CELULAR / TABLET", 
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color="#ffffff"
        )
        qr_title.pack(pady=(16, 4))

        qr_subtitle = ctk.CTkLabel(
            right_frame, 
            text="Aponte a câmera do seu celular para abrir:", 
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#94a3b8"
        )
        qr_subtitle.pack(pady=(0, 10))

        # Gera o QR Code com Pillow
        qr_pil_img = self.generate_qr_code()
        self.qr_ctk_image = ctk.CTkImage(light_image=qr_pil_img, dark_image=qr_pil_img, size=(220, 220))

        self.qr_label = ctk.CTkLabel(right_frame, text="", image=self.qr_ctk_image)
        self.qr_label.pack(pady=4)

        # Instruções dos 2 Celulares
        guide_frame = ctk.CTkFrame(right_frame, fg_color="#0a0e17", corner_radius=12)
        guide_frame.pack(fill="both", expand=True, padx=16, pady=14)

        guide_title = ctk.CTkLabel(
            guide_frame, 
            text="💡 DICA PARA OS 2 CELULARES:", 
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            text_color="#00e5ff"
        )
        guide_title.pack(anchor="w", padx=12, pady=(10, 4))

        guide_p1 = ctk.CTkLabel(
            guide_frame, 
            text="• Celular 1 (Volante): Toque na aba 'PAINEL' para ver velocímetro, RPM, marcha e luzes.", 
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color="#cbd5e1",
            justify="left",
            wraplength=260
        )
        guide_p1.pack(anchor="w", padx=12, pady=2)

        guide_p2 = ctk.CTkLabel(
            guide_frame, 
            text="• Celular 2 (Para-brisa): Toque na aba 'GPS / MAPA' para ver o mapa do caminhão ao vivo.", 
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color="#cbd5e1",
            justify="left",
            wraplength=260
        )
        guide_p2.pack(anchor="w", padx=12, pady=(2, 10))

    def generate_qr_code(self):
        """Gera o QR Code em memória para o IP local."""
        target_url = f"http://{LOCAL_IP}:{PORT}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=8,
            border=2,
        )
        qr.add_data(target_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="white", back_color="#0b0f19")
        return img.get_image()

    def update_status_loop(self):
        """Atualiza a interface com status real do ETS2 e quantidade de celulares conectados."""
        if not self.is_running:
            return

        # 1. Atualiza Status do Jogo
        if reader.is_connected:
            self.game_badge.configure(
                text="🟢 CONECTADO AO ETS2 (AO VIVO)", 
                text_color="#00e676"
            )
            self.game_desc.configure(
                text="O jogo está transmitindo dados em tempo real da sua viagem!"
            )
        else:
            self.game_badge.configure(
                text="🟡 MODO DEMONSTRAÇÃO (Aguardando ETS2 abrir...)", 
                text_color="#ffab00"
            )
            self.game_desc.configure(
                text="A simulação realista está ativa para você testar os celulares.\nAo abrir o ETS2 com o plugin .dll, a conexão sincroniza ao vivo!"
            )

        # 2. Atualiza Contagem de Aparelhos Conectados
        count = len(connected_clients)
        if count == 0:
            self.devices_label.configure(
                text="📱 Nenhum celular conectado no momento",
                text_color="#94a3b8"
            )
        elif count == 1:
            self.devices_label.configure(
                text="📱 1 celular conectado e recebendo telemetria!",
                text_color="#00e676"
            )
        else:
            self.devices_label.configure(
                text=f"📱 {count} celulares/tablets conectados ao mesmo tempo!",
                text_color="#00e676"
            )

        # Repete a verificação a cada 1 segundo
        self.after(1000, self.update_status_loop)

    def open_browser(self):
        webbrowser.open(f"http://localhost:{PORT}")

    def copy_url(self):
        self.clipboard_clear()
        self.clipboard_append(f"http://{LOCAL_IP}:{PORT}")
        messagebox.showinfo("Copiado!", f"Endereço copiado para a área de transferência:\nhttp://{LOCAL_IP}:{PORT}")

    def unblock_firewall(self):
        """Executa a liberação da porta no firewall com elevação UAC."""
        bat_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "liberar_firewall.bat")
        if os.path.exists(bat_path):
            try:
                subprocess.Popen(f'powershell -Command "Start-Process cmd -ArgumentList \'/c \"\"\"{bat_path}\"\"\"\' -Verb RunAs"', shell=True)
            except Exception as e:
                messagebox.showerror("Erro", f"Não foi possível abrir a liberação do firewall: {e}")
        else:
            messagebox.showerror("Erro", "Arquivo liberar_firewall.bat não foi encontrado.")

    def on_closing(self):
        self.is_running = False
        if self.server_instance:
            self.server_instance.should_exit = True
        self.destroy()
        sys.exit(0)

if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    app_gui = TelemetryServerApp()
    app_gui.mainloop()

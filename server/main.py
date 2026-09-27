import asyncio
import io
import socket
import os
import sys
from typing import Set, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
import qrcode
import uvicorn
import psutil

from ets2_reader import ETS2Reader
from router import router_instance
from truckersmp_bridge import truckersmp_bridge_instance

reader = ETS2Reader()

connected_clients: Set[WebSocket] = set()

def get_local_ip() -> str:
    """Detecta automaticamente o IP da placa de rede local (Wi-Fi/Ethernet)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

LOCAL_IP = get_local_ip()
PORT = 8000
USE_HTTPS = os.getenv("USE_HTTPS", "0") in ("1", "true", "True") or "--https" in sys.argv
CERT_FILE = os.path.join(os.path.dirname(__file__), "cert.pem")
KEY_FILE = os.path.join(os.path.dirname(__file__), "key.pem")
HTTPS_AVAILABLE = os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE)

def free_port(port: int = PORT):
    """Encontra e finaliza qualquer processo zumbi que esteja travando a porta especificada."""
    current_pid = os.getpid()
    try:
        for conn in psutil.net_connections(kind='inet'):
            if conn.laddr and conn.laddr.port == port:
                if conn.pid and conn.pid != current_pid:
                    try:
                        p = psutil.Process(conn.pid)
                        print(f"[Aviso] Liberando porta {port} ocupada pelo PID {conn.pid} ({p.name()})...")
                        p.kill()
                        p.wait(timeout=1.5)
                    except Exception:
                        pass
    except Exception as e:
        print(f"[Port Checker] {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Precarrega os dados do grafo rodoviário em segundo plano sem travar inicialização
    asyncio.create_task(asyncio.to_thread(router_instance.load_data))
    task = asyncio.create_task(telemetry_broadcast_loop())
    protocol = "https" if USE_HTTPS and HTTPS_AVAILABLE else "http"
    print("\n" + "="*60)
    print("   EURO TRUCK SIMULATOR 2 - TRUCKPILOT PRO SERVIDOR")
    print("="*60)
    print(f" -> IP Local detectado : {LOCAL_IP}")
    print(f" -> Acesso no Navegador: {protocol}://{LOCAL_IP}:{PORT}")
    print(f" -> WebSocket ativo em : {'wss' if protocol == 'https' else 'ws'}://{LOCAL_IP}:{PORT}/ws")
    if protocol == "https":
        print(" -> Contexto Seguro (HTTPS) ATIVO: Wake Lock nativo permitido em aparelhos móveis!")
    else:
        print(" -> Modo Padrão (HTTP). Para Wake Lock nativo em dispositivos remotos, use HTTPS.")
    print("="*60 + "\n")
    yield
    task.cancel()

app = FastAPI(title="TruckPilot Pro Telemetry Server", version="1.0.0", lifespan=lifespan)

# Permitir CORS para requisições de desenvolvimento e tablets
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/info")
def get_info():
    """Retorna dados de rede e status da conexão com o simulador e do roteador."""
    protocol = "https" if USE_HTTPS and HTTPS_AVAILABLE else "http"
    return {
        "local_ip": LOCAL_IP,
        "port": PORT,
        "protocol": protocol,
        "is_https": (protocol == "https"),
        "https_available": HTTPS_AVAILABLE,
        "web_url": f"{protocol}://{LOCAL_IP}:{PORT}",
        "game_connected": reader.is_connected,
        "connected_clients": len(connected_clients),
        "router_loaded": router_instance.is_loaded,
    }

@app.get("/api/route")
async def get_route(
    start_x: float,
    start_z: float,
    city_dst_id: Optional[str] = None,
    city_dst: Optional[str] = None,
    comp_dst_id: Optional[str] = None,
    comp_dst: Optional[str] = None,
):
    """
    Calcula a rota sobre a malha oficial de rodovias do ETS2.
    Executado em thread assíncrona para não bloquear o loop de telemetria (30 FPS).
    """
    route_res = await asyncio.to_thread(
        router_instance.calculate_route,
        start_x=start_x,
        start_z=start_z,
        city_dst_id=city_dst_id,
        city_dst_name=city_dst,
        comp_dst_id=comp_dst_id,
        comp_dst_name=comp_dst,
    )
    return route_res

@app.get("/api/qr")
def get_qr_code(port: int = PORT):
    """Gera uma imagem PNG de QR Code para apontar a câmera do celular direto para a página."""
    target_url = f"http://{LOCAL_IP}:{port}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=8,
        border=2,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="white", back_color="black")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")

import json
from key_sender import trigger_action
from autopilot import autopilot_manager

@app.post("/api/action/{action_name}")
@app.get("/api/action/{action_name}")
def post_action(action_name: str):
    """Permite disparar ações (teclas) no ETS2 via requisição HTTP rápida."""
    success = trigger_action(action_name)
    return {"action": action_name, "success": success}

@app.post("/api/autopilot/toggle")
@app.get("/api/autopilot/toggle")
def toggle_autopilot():
    """Ativa ou desativa o Piloto Automático Inteligente sincronizado com placas."""
    status = autopilot_manager.toggle()
    return {"autopilot": status}

@app.get("/api/autopilot/status")
def get_autopilot_status():
    return {"autopilot": autopilot_manager.is_enabled}

@app.get("/api/truckersmp/players")
def get_truckersmp_players():
    """Retorna a lista de jogadores reais no TruckersMP (Shared Memory)."""
    data = reader.get_data()
    placement = data.get("placement", {})
    px = placement.get("x", -28842.0)
    pz = placement.get("z", 4982.0)
    heading = placement.get("heading", 0.0)
    return truckersmp_bridge_instance.get_telemetry_payload(px, pz, heading, enable_simulation=False)

@app.post("/api/truckersmp/feed")
async def post_truckersmp_feed(payload: Dict[str, Any]):
    """Recebe telemetria de jogadores do TruckersMP injetada por plugins externos ou bridge REST."""
    players = payload.get("players", [])
    truckersmp_bridge_instance.set_manual_feed(players)
    return {"status": "ok", "received_players": len(players)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            msg = await websocket.receive_text()
            try:
                data = json.loads(msg)
                action = data.get("action")
                if action:
                    trigger_action(action)
            except Exception:
                pass
    except WebSocketDisconnect:
        connected_clients.discard(websocket)
    except Exception:
        connected_clients.discard(websocket)


async def telemetry_broadcast_loop():
    """Loop contínuo de broadcast assíncrono (~30 fps / 33ms por tick)."""
    autopilot_manager.init_with_reader(reader)
    while True:
        if connected_clients:
            telemetry_data = reader.get_data()
            telemetry_data["autopilot"] = autopilot_manager.is_enabled
            dead_clients = set()
            for ws in list(connected_clients):
                try:
                    await ws.send_json(telemetry_data)
                except Exception:
                    dead_clients.add(ws)
            for ws in dead_clients:
                connected_clients.discard(ws)
        else:
            # Mesmo sem clientes conectados, continua atualizando status interno
            reader.get_data()
        await asyncio.sleep(0.033) # 30 FPS

# Se os arquivos estáticos do React compilado existirem, serve na raiz
dist_dir = os.path.join(os.path.dirname(__file__), "..", "client", "dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")

def start_server():
    """Inicia o servidor liberando a porta primeiro se necessário."""
    free_port(PORT)
    ssl_kwargs = {}
    if USE_HTTPS and HTTPS_AVAILABLE:
        ssl_kwargs = {
            "ssl_keyfile": KEY_FILE,
            "ssl_certfile": CERT_FILE,
        }
    config = uvicorn.Config(app=app, host="0.0.0.0", port=PORT, log_level="warning", **ssl_kwargs)
    server = uvicorn.Server(config)
    server.run()

if __name__ == "__main__":
    start_server()

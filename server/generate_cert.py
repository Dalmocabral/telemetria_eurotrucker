"""
Gerador de Certificado SSL Autoassinado Local para HTTPS.
Permite ativar o contexto seguro (HTTPS) no TruckPilot Pro para que navegadores
móveis (Android / iOS) permitam a Screen Wake Lock API nativa na rede Wi-Fi.
Utiliza o OpenSSL incluído no Git for Windows ou biblioteca Python.
"""

import os
import sys
import socket
import subprocess

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def find_openssl() -> str:
    # 1. Verifica no PATH
    try:
        subprocess.run(["openssl", "version"], capture_output=True, check=True)
        return "openssl"
    except Exception:
        pass

    # 2. Verifica locais padrão do Git for Windows
    git_paths = [
        r"C:\Program Files\Git\usr\bin\openssl.exe",
        r"C:\Program Files (x86)\Git\usr\bin\openssl.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Git\usr\bin\openssl.exe"),
    ]
    for p in git_paths:
        if os.path.exists(p):
            return p

    return "openssl"

def generate_self_signed_cert(dest_dir: str = None, ip: str = None) -> bool:
    if not dest_dir:
        dest_dir = os.path.dirname(os.path.abspath(__file__))
    if not ip:
        ip = get_local_ip()

    cert_path = os.path.join(dest_dir, "cert.pem")
    key_path = os.path.join(dest_dir, "key.pem")
    config_path = os.path.join(dest_dir, "openssl_san.cnf")

    openssl_bin = find_openssl()

    # Cria configuração com Subject Alternative Names (SAN) obrigatório para Chrome/Safari
    config_content = f"""[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = BR
ST = SP
L = Local
O = TruckPilot Pro
CN = {ip}

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment

[alt_names]
IP.1 = 127.0.0.1
IP.2 = {ip}
DNS.1 = localhost
"""

    with open(config_path, "w", encoding="utf-8") as f:
        f.write(config_content)

    try:
        cmd = [
            openssl_bin,
            "req",
            "-x509",
            "-nodes",
            "-days", "1095",
            "-newkey", "rsa:2048",
            "-keyout", key_path,
            "-out", cert_path,
            "-config", config_path,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and os.path.exists(cert_path) and os.path.exists(key_path):
            print(f"[HTTPS] Certificado SSL gerado com sucesso para {ip}!")
            print(f" -> Certificado : {cert_path}")
            print(f" -> Chave Privada: {key_path}")
            return True
        else:
            print(f"[HTTPS] Erro ao gerar certificado via OpenSSL: {res.stderr}")
            return False
    except Exception as e:
        print(f"[HTTPS] Exceção ao executar OpenSSL: {e}")
        return False
    finally:
        if os.path.exists(config_path):
            try:
                os.remove(config_path)
            except Exception:
                pass

if __name__ == "__main__":
    generate_self_signed_cert()

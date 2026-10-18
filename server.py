#!/usr/bin/env python3
"""
Servidor HTTP ligero para GAROZO! Party Game (Puerto 8080).
Detecta automáticamente la dirección IP local en la red Wi-Fi para poder
jugar desde smartphones, iPads o tablets conectados a la misma red.
"""

import http.server
import socket
import socketserver
import os

PORT = 8080


def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("0.0.0.0", PORT), handler) as httpd:
        print("=" * 60)
        print("🎲 GAROZO! Party Game — Servidor Local Activo")
        print(f"💻 En este PC:          http://localhost:{PORT}")
        print(f"📱 En tu móvil / iPad:  http://{local_ip}:{PORT}")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")

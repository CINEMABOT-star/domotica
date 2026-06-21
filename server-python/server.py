from __future__ import annotations

import hashlib
import hmac
import json
import mimetypes
import secrets
import threading
import time
from http import cookies
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "server" / "public"
CONFIG_PATH = ROOT / "server-python" / "config.json"
STATE_PATH = ROOT / "server-python" / "state.json"

state_lock = threading.RLock()
devices: dict[str, dict] = {}
pending_commands: dict[str, str] = {}
sessions: dict[str, float] = {}
sse_clients = []


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        raise SystemExit("Manca server-python/config.json. Esegui PREPARA_DOMOTICA.bat")
    with CONFIG_PATH.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


CONFIG = load_config()
PORT = int(CONFIG.get("port", 8000))


def load_state() -> None:
    if not STATE_PATH.exists():
        return
    try:
        data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        with state_lock:
            devices.update(data.get("devices", {}))
    except Exception:
        pass


def save_state() -> None:
    with state_lock:
        payload = {"devices": devices}
    STATE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def password_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def list_devices() -> list[dict]:
    with state_lock:
        items = list(devices.values())
    return sorted(items, key=lambda item: (item.get("room", "Casa"), item.get("name", item.get("id", ""))))


def broadcast(event: dict) -> None:
    data = f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode("utf-8")
    dead = []
    with state_lock:
        clients = list(sse_clients)
    for client in clients:
        try:
            client.write(data)
            client.flush()
        except Exception:
            dead.append(client)
    if dead:
        with state_lock:
            for client in dead:
                if client in sse_clients:
                    sse_clients.remove(client)


def update_device(device_id: str, patch: dict) -> None:
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with state_lock:
        current = devices.get(
            device_id,
            {
                "id": device_id,
                "name": device_id,
                "room": "Casa",
                "type": "light",
                "state": "unknown",
                "availability": "online",
                "rssi": None,
                "uptimeMs": None,
            },
        )
        clean_patch = {key: value for key, value in patch.items() if value is not None}
        devices[device_id] = {**current, **clean_patch, "id": device_id, "updatedAt": now, "availability": "online"}
    save_state()
    broadcast({"type": "devices", "devices": list_devices()})


class Handler(BaseHTTPRequestHandler):
    server_version = "DomoticaPython/1.0"

    def log_message(self, format: str, *args) -> None:
        return

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(min(length, 64 * 1024))
        return json.loads(raw.decode("utf-8"))

    def current_session(self) -> str | None:
        header = self.headers.get("Cookie", "")
        jar = cookies.SimpleCookie()
        try:
            jar.load(header)
        except cookies.CookieError:
            return None
        morsel = jar.get("domotica_session")
        if not morsel:
            return None
        sid = morsel.value
        with state_lock:
            expiry = sessions.get(sid)
            if not expiry or expiry < time.time():
                sessions.pop(sid, None)
                return None
            sessions[sid] = time.time() + 12 * 60 * 60
        return sid

    def require_auth(self) -> bool:
        if self.current_session():
            return True
        self.send_json(401, {"error": "Non autorizzato"})
        return False

    def require_device_token(self) -> bool:
        provided = self.headers.get("X-Device-Token", "")
        expected = CONFIG.get("device_token", "")
        if expected and hmac.compare_digest(provided, expected):
            return True
        self.send_json(401, {"error": "Token dispositivo non valido"})
        return False

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/session":
            self.send_json(200, {"authenticated": bool(self.current_session()), "username": CONFIG.get("admin_username")})
            return

        if path == "/api/devices":
            if not self.require_auth():
                return
            self.send_json(200, {"devices": list_devices(), "mqttConnected": True})
            return

        if path == "/api/events":
            if not self.current_session():
                self.send_response(401)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            with state_lock:
                sse_clients.append(self.wfile)
            try:
                self.wfile.write(f"data: {json.dumps({'type': 'devices', 'devices': list_devices()}, ensure_ascii=False)}\n\n".encode("utf-8"))
                self.wfile.flush()
                while True:
                    time.sleep(15)
                    self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
            except Exception:
                with state_lock:
                    if self.wfile in sse_clients:
                        sse_clients.remove(self.wfile)
            return

        if path == "/api/device/poll":
            if not self.require_device_token():
                return
            query = parse_qs(parsed.query)
            device_id = (query.get("id") or [""])[0].strip()
            if not valid_device_id(device_id):
                self.send_json(400, {"error": "ID dispositivo non valido"})
                return
            with state_lock:
                command = pending_commands.pop(device_id, "none")
            self.send_json(200, {"state": command})
            return

        self.serve_static(path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/login":
            try:
                data = self.read_json()
            except Exception:
                self.send_json(400, {"error": "JSON non valido"})
                return
            username_ok = hmac.compare_digest(str(data.get("username", "")), str(CONFIG.get("admin_username", "admin")))
            password_ok = hmac.compare_digest(password_hash(str(data.get("password", ""))), str(CONFIG.get("admin_password_hash", "")))
            if not (username_ok and password_ok):
                self.send_json(401, {"error": "Credenziali non valide"})
                return
            sid = secrets.token_urlsafe(32)
            with state_lock:
                sessions[sid] = time.time() + 12 * 60 * 60
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", f"domotica_session={sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return

        if path == "/api/logout":
            sid = self.current_session()
            if sid:
                with state_lock:
                    sessions.pop(sid, None)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", "domotica_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return

        if path.startswith("/api/devices/") and path.endswith("/command"):
            if not self.require_auth():
                return
            parts = path.split("/")
            device_id = unquote(parts[3]) if len(parts) > 3 else ""
            if not valid_device_id(device_id):
                self.send_json(400, {"error": "ID dispositivo non valido"})
                return
            try:
                data = self.read_json()
            except Exception:
                self.send_json(400, {"error": "JSON non valido"})
                return
            command = str(data.get("state", "")).strip()
            if command not in {"on", "off", "toggle"}:
                self.send_json(400, {"error": "Comando non valido"})
                return
            with state_lock:
                pending_commands[device_id] = command
            self.send_json(200, {"ok": True})
            return

        if path == "/api/device/state":
            if not self.require_device_token():
                return
            try:
                data = self.read_json()
            except Exception:
                self.send_json(400, {"error": "JSON non valido"})
                return
            device_id = str(data.get("id", "")).strip()
            if not valid_device_id(device_id):
                self.send_json(400, {"error": "ID dispositivo non valido"})
                return
            update_device(
                device_id,
                {
                    "name": data.get("name"),
                    "room": data.get("room"),
                    "type": data.get("type", "light"),
                    "state": data.get("state"),
                    "rssi": data.get("rssi"),
                    "uptimeMs": data.get("uptimeMs"),
                    "reason": data.get("reason"),
                },
            )
            self.send_json(200, {"ok": True})
            return

        self.send_json(404, {"error": "Non trovato"})

    def serve_static(self, request_path: str) -> None:
        if request_path == "/":
            request_path = "/index.html"
        clean = unquote(request_path).lstrip("/")
        target = (PUBLIC_DIR / clean).resolve()
        if not str(target).startswith(str(PUBLIC_DIR.resolve())) or not target.exists() or not target.is_file():
            self.send_response(404)
            self.end_headers()
            return
        content = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(str(target))[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def valid_device_id(value: str) -> bool:
    if not value or len(value) > 64:
        return False
    return all(char.isalnum() or char in "_-" for char in value)


if __name__ == "__main__":
    load_state()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Domotica avviata: http://localhost:{PORT}")
    print("Lascia questa finestra aperta.")
    server.serve_forever()

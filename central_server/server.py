#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

HOST = "0.0.0.0"
PORT = 8000


def _read_json(handler):
    length = int(handler.headers.get("Content-Length", 0))
    if length <= 0:
        return None
    try:
        raw = handler.rfile.read(length)
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return None


class RequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path == "/voice_transcription_in":
            data = _read_json(self)
            self._send_json(200, {"ok": True, "received": data})
            return
        if self.path == "/sensor_information_in":
            data = _read_json(self)
            self._send_json(200, {"ok": True, "received": data})
            return
        if self.path == "/news_information_in":
            data = _read_json(self)
            self._send_json(200, {"ok": True, "received": data})
            return

        self._send_json(404, {"ok": False, "error": "not_found"})

    def do_GET(self):
        if self.path == "/danger_entities_out":
            self._send_json(200, {"ok": True, "danger_entities": []})
            return

        self._send_json(404, {"ok": False, "error": "not_found"})

    def log_message(self, fmt, *args):
        # Keep logs minimal and consistent.
        return


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), RequestHandler)
    print(f"Central server listening on http://{HOST}:{PORT}")
    server.serve_forever()

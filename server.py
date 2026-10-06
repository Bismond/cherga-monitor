from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import os

HOST = "127.0.0.1"
PORT = 8080
API_HOST = "https://cherga.dmsu.gov.ua"


class MonitorHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy_api_request()
            return
        super().do_GET()

    def proxy_api_request(self):
        api_path = urlsplit(self.path).path
        query = urlsplit(self.path).query
        target = f"{API_HOST}{api_path}"
        if query:
            target += f"?{query}"

        try:
            request = Request(target, headers={"Accept": "application/json"})
            with urlopen(request, timeout=20) as response:
                body = response.read()
                status = response.status
                content_type = response.headers.get_content_type()
        except HTTPError as error:
            body = error.read()
            status = error.code
            content_type = "application/json"
        except (TimeoutError, URLError, OSError) as error:
            reason = getattr(error, "reason", str(error))
            body = ('{"error":"Proxy request failed: %s"}' % reason).encode()
            status = 504 if isinstance(error, TimeoutError) else 502
            content_type = "application/json"

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = ThreadingHTTPServer((HOST, PORT), MonitorHandler)
    print(f"DMSU monitor available at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
    finally:
        server.server_close()

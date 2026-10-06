DMSU queue monitor

1. Open Terminal and run:
   cd ~/Desktop/cherga-monitor
   python3 server.py
2. Open http://localhost:8080 in a browser.
3. Click "Дозволити сповіщення", then "Запустити моніторинг".

If you see "Address already in use", stop the old server and run the command again:
   lsof -ti :8080 | xargs kill

You can also use another port:
   python3 -c "import server; server.PORT = 8081; server.ThreadingHTTPServer((server.HOST, server.PORT), server.MonitorHandler).serve_forever()"
Then open http://localhost:8081.

The page checks all three addresses immediately and then once every 60 seconds. It uses browser notifications and a short sound when response.data is a non-empty array.

The local server also proxies API requests through /api, so browser CORS restrictions do not affect the monitor.

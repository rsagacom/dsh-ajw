#!/usr/bin/env python3
# DS安甲网 本地预览服务器（多线程, 支持并发与 keep-alive 不阻塞）
import http.server
import socketserver
import sys
import os

PORT = 8899
DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'site')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    print(f'Serving {DIR} at http://127.0.0.1:{PORT}')
    with Server(('127.0.0.1', PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

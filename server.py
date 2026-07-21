#!/usr/bin/env python3
"""
Development server for PKBM LMS.
Serves static files on port 3000 using Python's built-in http.server.

Usage:
    python server.py
"""

import http.server
import socketserver
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()


def main():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"PKBM LMS Development Server")
        print(f"Serving at http://localhost:{PORT}")
        print(f"Directory: {DIRECTORY}")
        print(f"Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)


if __name__ == "__main__":
    main()

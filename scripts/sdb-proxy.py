# Reenvía 127.0.0.1:26111 -> TV:26101 (evita el bloqueo de "Red local" de macOS al daemon de sdb)
import socket, threading, sys
TV = (sys.argv[1] if len(sys.argv) > 1 else '192.168.1.93', 26101)
def pipe(a, b):
    try:
        while (d := a.recv(65536)): b.sendall(d)
    except OSError: pass
    finally: a.close(); b.close()
srv = socket.socket(); srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(('127.0.0.1', 26111)); srv.listen(4)
while True:
    c, _ = srv.accept(); t = socket.create_connection(TV)
    threading.Thread(target=pipe, args=(c, t), daemon=True).start()
    threading.Thread(target=pipe, args=(t, c), daemon=True).start()

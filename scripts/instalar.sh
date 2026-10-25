#!/bin/sh
# Firma un .wgt con el perfil de Samsung y lo instala en la TV a través del reenviador local.
#
#   scripts/instalar.sh <archivo.wgt> [--abrir]
#
# Variables: TV_IP (192.168.1.93), PERFIL (samsungtv).
set -eu

TV_IP="${TV_IP:-192.168.1.93}"
PERFIL="${PERFIL:-samsungtv}"
SDB="$HOME/tizen-studio/tools/sdb"
TIZEN="$HOME/tizen-studio/tools/ide/bin/tizen"
DIR="$(cd "$(dirname "$0")" && pwd)"
DEV="emulator-26111"
REMOTO="/home/owner/share/tmp/sdk_tools"

[ $# -ge 1 ] || { echo "Uso: $0 <archivo.wgt> [--abrir]"; exit 1; }
WGT="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"

# 1. Reenviador 127.0.0.1:26111 -> TV:26101 (evita el bloqueo de Red local de macOS a sdb)
if ! nc -z 127.0.0.1 26111 2>/dev/null; then
    nohup python3 "$DIR/sdb-proxy.py" "$TV_IP" >/dev/null 2>&1 &
    sleep 1
fi
"$SDB" connect 127.0.0.1:26111 >/dev/null 2>&1 || true   # falla si ya estaba conectado
"$SDB" devices | grep -q "$DEV" || { echo "La TV no responde. ¿Modo desarrollador activo y TV reiniciada?"; exit 1; }

# 2. Firmar una copia (el original queda sin firmar)
TMP="$(mktemp -d)"
cp "$WGT" "$TMP/"
NOMBRE="$(basename "$WGT")"
"$TIZEN" package -t wgt -s "$PERFIL" -- "$TMP/$NOMBRE" | grep -E "created|rror" || true

# 3. El id del paquete sale del config.xml del propio .wgt
PAQUETE="$(unzip -p "$TMP/$NOMBRE" config.xml | sed -n 's/.*package="\([A-Za-z0-9]\{10\}\)".*/\1/p' | head -1)"
APPID="$(unzip -p "$TMP/$NOMBRE" config.xml | sed -n 's/.*tizen:application id="\([^"]*\)".*/\1/p' | head -1)"
echo "Paquete: $PAQUETE  App: $APPID"

# 4. Copiar e instalar con las herramientas de la TV
"$SDB" -s "$DEV" push "$TMP/$NOMBRE" "$REMOTO/$NOMBRE" >/dev/null
"$SDB" -s "$DEV" shell 0 vd_appinstall "$PAQUETE" "$REMOTO/$NOMBRE" | tail -2
"$SDB" -s "$DEV" shell 0 rm "$REMOTO/$NOMBRE" >/dev/null 2>&1 || true
rm -rf "$TMP"

if [ "${2:-}" = "--abrir" ]; then
    "$SDB" -s "$DEV" shell 0 was_execute "$APPID" | tail -1
fi

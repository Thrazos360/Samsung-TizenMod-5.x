#!/bin/sh
# Renders scripts/background.html to src/img/bg.jpg with headless Chrome (macOS).
set -eu
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
    --window-size=1920,1080 --user-data-dir="$tmp/profile" --screenshot="$tmp/bg.png" \
    "file://$PWD/scripts/background.html" >/dev/null 2>&1
sips -s format jpeg -s formatOptions 92 "$tmp/bg.png" --out src/img/bg.jpg >/dev/null
rm -rf "$tmp"
echo "Wrote src/img/bg.jpg"

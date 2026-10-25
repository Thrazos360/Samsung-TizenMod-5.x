#!/bin/sh
# Packages src/ into dist/tizenmod.wgt (unsigned; Apps2Samsung signs it on install).
set -eu
cd "$(dirname "$0")/.."

[ -f src/icon.png ] || node scripts/make-icon.mjs
# index.html always loads this; an absent file would only be a console error, but there is no
# reason to ship one. Gitignored, so creating it here cannot dirty the tree.
[ -f src/js/config.local.js ] || echo '/* No local overrides. See config.local.example.js. */' > src/js/config.local.js
[ -f src/js/wallpapers.local.js ] || echo '/* No local wallpapers. See scripts/add-wallpapers.mjs. */' > src/js/wallpapers.local.js
node scripts/build-marks.mjs

mkdir -p dist
rm -f dist/tizenmod.wgt
(cd src && zip -q -r -X ../dist/tizenmod.wgt . -x '*.DS_Store' -x '.*' -x 'img/marks/*' \
  -x 'img/easter-egg/*.jpg' -x 'img/easter-egg/runner.png' -x 'img/easter-egg/obstacle.png' \
  -x 'img/easter-egg/obstacle-face.png')

echo "Built dist/tizenmod.wgt"
unzip -l dist/tizenmod.wgt

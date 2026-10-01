#!/usr/bin/env bash
# Build release assets into dist/:
#   bilibili-ambient-extension-v<ver>.zip   (unpack and "Load unpacked" in Chrome)
#   bilibili-ambient.user.js                (Tampermonkey / Violentmonkey)
set -euo pipefail
cd "$(dirname "$0")/.."

ext_ver=$(python3 -c 'import json; print(json.load(open("extension/manifest.json"))["version"])')
us_ver=$(sed -n 's#^// @version[[:space:]]*##p' userscript/bilibili-ambient.user.js)

rm -rf dist
mkdir -p dist/bilibili-ambient-extension
cp -R extension/manifest.json extension/src extension/icons LICENSE dist/bilibili-ambient-extension/
(cd dist && zip -qr "bilibili-ambient-extension-v${ext_ver}.zip" bilibili-ambient-extension)
cp userscript/bilibili-ambient.user.js dist/

echo "extension  v${ext_ver}  -> dist/bilibili-ambient-extension-v${ext_ver}.zip"
echo "userscript v${us_ver}  -> dist/bilibili-ambient.user.js"

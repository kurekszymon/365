#!/usr/bin/env bash
# render.sh <workdir> <out-basename>
# <workdir> holds slide.html + plan.png. Writes <out>.jpg (1080x1350) and <out>@2x.png (2160x2700) into <workdir>.
set -euo pipefail
W="$(cd "$1" && pwd)"; OUT="$2"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=1080,1350 --virtual-time-budget=5000 \
  --screenshot="$W/$OUT@2x.png" "file://$W/slide.html" 2>/dev/null
magick "$W/$OUT@2x.png" -filter Lanczos -resize 1080x1350 -quality 95 "$W/$OUT.jpg"
magick identify "$W/$OUT.jpg" "$W/$OUT@2x.png"

#!/usr/bin/env bash
# crop45.sh <src> <out.jpg> [fx] [fy]
# Largest 4:5 box from <src>, centred on focus point (fx, fy) given as fractions of width/height
# (default 0.5 0.5, clamped to the image), resized to 1080x1350. Crop + resize only - never generate.
set -euo pipefail
SRC="$1"; OUT="$2"; FX="${3:-0.5}"; FY="${4:-0.5}"
read -r W H < <(magick identify -format '%w %h\n' "$SRC")
read -r CW CH X Y < <(awk -v w="$W" -v h="$H" -v fx="$FX" -v fy="$FY" 'BEGIN{
  if (w*5 > h*4) { ch=h; cw=int(h*4/5) } else { cw=w; ch=int(w*5/4) }
  x=int(w*fx-cw/2); y=int(h*fy-ch/2)
  if (x<0) x=0; if (x>w-cw) x=w-cw; if (y<0) y=0; if (y>h-ch) y=h-ch
  print cw, ch, x, y }')
magick "$SRC" -auto-orient -crop "${CW}x${CH}+${X}+${Y}" +repage -filter Lanczos -resize '1080x1350!' \
  -unsharp 0x0.6+0.6+0.02 -colorspace sRGB -strip -quality 92 -sampling-factor 4:4:4 "$OUT"
awk -v cw="$CW" 'BEGIN{ s=1080/cw; printf "crop %s  upscale %.2fx%s\n", ARGV[1], s, (s>1.3?"  <- soft, flag it":"") }' "${CW}x${CH}+${X}+${Y}"

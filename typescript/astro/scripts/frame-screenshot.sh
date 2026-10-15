#!/usr/bin/env bash
# Pads a screenshot with its own background color, rounds the corners
# and draws a faint outline. Requires ImageMagick 7 (`magick`).
#
# usage: scripts/frame-screenshot.sh [-p padding] [-r radius] in.png [out.png]
# Overwrites in.png when out.png is omitted.
set -euo pipefail

pad=48
radius=28

while getopts "p:r:" opt; do
	case $opt in
	p) pad=$OPTARG ;;
	r) radius=$OPTARG ;;
	*) sed -n '5p' "$0" >&2; exit 1 ;;
	esac
done
shift $((OPTIND - 1))

[[ $# -ge 1 ]] || { sed -n '5p' "$0" >&2; exit 1; }
in=$1
out=${2:-$1}

bg=$(magick "$in" -format "%[pixel:p{2,2}]" info:)
read -r w h < <(magick "$in" -format "%[fx:w+2*$pad] %[fx:h+2*$pad]\n" info:)

magick "$in" -bordercolor "$bg" -border "$pad" \
	\( -size "${w}x${h}" xc:none -fill white \
		-draw "roundrectangle 0,0,$((w - 1)),$((h - 1)),$radius,$radius" \) \
	-alpha set -compose DstIn -composite \
	\( -size "${w}x${h}" xc:none -fill none -stroke "rgba(0,0,0,0.12)" -strokewidth 2 \
		-draw "roundrectangle 1,1,$((w - 2)),$((h - 2)),$radius,$radius" \) \
	-compose Over -composite "$out"

echo "$out (${w}x${h})"

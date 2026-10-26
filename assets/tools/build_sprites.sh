#!/usr/bin/env bash
# ==========================================================================
# build_sprites.sh — Aseprite(헤드리스)로 픽셀 아트를 다시 만들고 js/sprites.js 로 묶는다.
#   1) assets/aseprite/*.lua 생성기 → assets/sprites/*.aseprite(원본) + *.png(시트) + *.json(메타)
#   2) node assets/tools/pack_sprites.js → js/sprites.js (base64 data URI)
# 그다음 bash build.sh 로 번들을 만든다.
# ASEPRITE 환경 변수로 실행 파일 경로를 바꿀 수 있다.
# ==========================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."
ASEPRITE="${ASEPRITE:-/c/Program Files/Aseprite/Aseprite.exe}"
if command -v cygpath >/dev/null 2>&1; then
  DIR="$(cygpath -m "$PWD/assets/aseprite")"; OUT="$(cygpath -m "$PWD/assets/sprites")"
else
  DIR="$PWD/assets/aseprite"; OUT="$PWD/assets/sprites"
fi
for gen in knight mobs world town icons title forge reboot bosses; do
  if [ -f "assets/aseprite/$gen.lua" ]; then
    "$ASEPRITE" -b --script-param dir="$DIR" --script-param out="$OUT" --script "assets/aseprite/$gen.lua"
  fi
done
node assets/tools/pack_sprites.js

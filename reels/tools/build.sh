#!/usr/bin/env bash
# Render + mix + mux one or more reels:  tools/build.sh v1 v2 v3
# Needs vo/<reel>/<seg>.mp3 and a timing.json from tools/timing.py (run that first).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
for r in "$@"; do
  node tools/render.mjs "$r" "out/${r}_silent.mp4"
  python3 tools/audio.py "$r"
  ffmpeg -v error -y -i "out/${r}_silent.mp4" -i "out/${r}_mix.wav" -map 0:v -map 1:a -c:v copy \
    -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "out/monaco_transmissions_${r}.mp4"
  echo "built out/monaco_transmissions_${r}.mp4"
done

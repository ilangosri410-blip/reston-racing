#!/bin/bash
# Trim each source to its strongest loopable moment and encode muted,
# web-weight WebM (VP9) + MP4 (H.264) pairs.
set -e
SRC=/root/.claude/uploads/2ccc54c5-4eb9-52d7-b93d-67b97dfc47c7
OUT=/home/claude/rr/assets/video
mkdir -p "$OUT"

enc () {  # enc <in> <ss> <t> <w> <h> <name> [extra_vf]
  local in="$1" ss="$2" t="$3" w="$4" h="$5" name="$6" extra="$7"
  local vf="scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},fps=30${extra}"
  ffmpeg -v error -y -ss "$ss" -t "$t" -i "$in" -an -vf "$vf" \
    -c:v libvpx-vp9 -b:v 0 -crf 34 -cpu-used 4 -row-mt 1 -deadline good \
    -pix_fmt yuv420p "$OUT/$name.webm"
  ffmpeg -v error -y -ss "$ss" -t "$t" -i "$in" -an -vf "$vf" \
    -c:v libx264 -crf 27 -preset slow -profile:v high -pix_fmt yuv420p \
    -movflags +faststart "$OUT/$name.mp4"
  echo "  $name  $(du -h "$OUT/$name.webm" | cut -f1) webm / $(du -h "$OUT/$name.mp4" | cut -f1) mp4"
}

echo "encoding..."
# 02 THE EVENT - slow-motion rear-wheel roost, the most cinematic texture shot
enc "$SRC/b91050b3-"*.webm 0 7.1 1280 720 event-roost

# 04 THE RACE - GoPro dune carve, the peak-energy sustained riding moment
enc "$SRC/9cb68ed9-"*.mp4 17.5 8 1280 720 race-carve

# 07 LOCATION - wide establishing dune vista, calm arrival
enc "$SRC/9cb68ed9-"*.mp4 0.5 8 1280 720 location-vista

# 03 EXPERIENCE - two vertical panels, kept in their native portrait framing
enc "$SRC/8cd627e8-"*.webm 0 9.8 540 960 exp-freestyle
enc "$SRC/a2429258-"*.MOV 0 5.3 540 960 exp-jumps

echo "done"
ls -la "$OUT"

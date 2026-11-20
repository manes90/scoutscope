# ScoutScope demo video

**File:** `video/clip.mp4` — 87.4 seconds, 1280×720, H.264 (yuv420p), 30 fps, 1,819,986 bytes.
**Structure:** title card (3s, Remotion) → live demo footage (70s, real app,
headless Chromium) → how-it-was-built card (10s, Remotion) → end card (5s).
**Audio:** none in this cut — on-screen text only. Narration is recorded
separately (see below) and mixed in with ffmpeg.

## How it was made

- Footage: `headless-screencast` skill — Playwright drives the real app in
  headless Chromium (Overview → Heatmap → Profiler → Anti-Strat → Planner
  with a map click → Data & Evidence), one continuous take, zero JS errors.
  Raw take + per-scene frames in `video/footage/` (git-ignored frames dir
  excluded; the `.webm` master is kept next to `clip.mp4` for re-cutting).
- Cards: `remotion-demo-video` skill — `~/workspace/remotion-demo/`,
  compositions `ScoutTitle` / `ScoutBuilt` / `ScoutEnd` in
  `src/ScoutCards.tsx`.
- Assembly: ffmpeg concat (title + footage trimmed to ~70s + built + end).
- Script: `video/script.md` (scene-by-scene, with callouts).
- Capture steps: `video/steps.json` (re-run with `scripts/capture.py`).

## Re-cut / re-record

```bash
# Re-record the footage (serves the app on :8321, records ~73s)
cd ~/workspace/hackathons/cloud9-jetbrains-2026
python3 -m http.server 8321 >/tmp/srv.log 2>&1 & echo $! > /tmp/srv.pid
~/workspace/.venvs/playwright/bin/python \
  ~/workspace/custom-skills/headless-screencast/scripts/capture.py \
  http://localhost:8321/index.html video/footage video/steps.json
kill $(cat /tmp/srv.pid)   # kill the EXACT pid, never by pattern

# Re-render a card (stills first to check the design)
cd ~/workspace/remotion-demo
/opt/hatch-image/bin/npx remotion still ScoutTitle out/scout-still-title.png --frame=60
/opt/hatch-image/bin/npx remotion render ScoutTitle out/scout-title.mp4

# Join: NORMALISE each part first, then concat. Do NOT concat the raw parts:
# the footage has time_base 1/15360 while the Remotion cards have 1/90000,
# and a straight re-encode froze the middle of the video on one frame
# (verified by frame md5s, 2026-11-20). Normalising to CFR 30 fps first fixes it.
mkdir -p /tmp/vbuild && cd /tmp/vbuild
for spec in "title:/home/hatch/workspace/remotion-demo/out/scout-title.mp4" "foot:/home/hatch/workspace/hackathons/cloud9-jetbrains-2026/video/footage/clip.mp4" "built:/home/hatch/workspace/remotion-demo/out/scout-built.mp4" "end:/home/hatch/workspace/remotion-demo/out/scout-end.mp4"; do
  name="${spec%%:*}"; src="${spec#*:}"
  ffmpeg -v error -y -i "$src" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" -c:v libx264 -preset veryfast -crf 20 -video_track_timescale 30 -r 30 -an "$name-norm.mp4"
done
printf "file 'title-norm.mp4'\nfile 'foot-norm.mp4'\nfile 'built-norm.mp4'\nfile 'end-norm.mp4'\n" > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -c copy /home/hatch/workspace/hackathons/cloud9-jetbrains-2026/video/clip.mp4
# Verify: extract frames at t=1,8,20,32,45,55,65,75,85 — all 9 md5s must differ.
```

## Add narration later (Yu records on his phone)

1. Yu records the voiceover on his phone (timed draft in `video/narration.md`,
   129 words, 7 beats, real-data numbers), sends the audio file (`.m4a` / `.mp3`).
2. Mix it under the video:
   `ffmpeg -y -i video/clip.mp4 -i voice.m4a -c:v copy -c:a aac -shortest video/clip-vo.mp4`
3. Re-check duration ≤ 3 min (rules limit) and re-upload.

## Upload to YouTube (needs Yu's channel — not done here)

1. YouTube Studio → Create → Upload videos → pick `video/clip.mp4`.
2. Title: `ScoutScope — VALORANT Tactical Scouting (Cloud9 × JetBrains Hackathon 2026)`.
3. Description: link the live demo `https://manes90.github.io/scoutscope/`
   and the repo `https://github.com/manes90/scoutscope`; note the data
   is real GRID telemetry (Cloud9 vs FURIA, VCT Americas Stage 2 2025,
   series 2819676) and the maps are original schematics.
4. Audience: **Not made for kids**. Visibility: Public (or Unlisted, then
   share the link in the Devpost submission).
5. Paste the YouTube link into the Devpost submission (video field).
6. Do not upload copyrighted music or Riot artwork — this video has neither.

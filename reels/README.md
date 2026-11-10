# Monaco Auto reels — DCT vs Automatic vs CVT vs Manual

Three 1080x1920 / 30 fps reels on the same topic, each with a different script and angle.
Every frame is drawn in code (canvas), so text, colours and timing can be changed and re-rendered.

| Reel | Angle | Hook | Voice |
| --- | --- | --- | --- |
| `v1` | How each one works (mechanism animations) | "Four transmissions. Here's how each one actually works." | Knox |
| `v2` | 0–200 km/h race, same engine in every lane | "Same engine. Four gearboxes. Who hits two hundred first?" | Dylan |
| `v3` | The habit that kills each one, and the fix | "Every transmission has one habit that kills it." | Jasper |

## Layout

- `lib/scripts.js` — the three scripts (captions + voiceover text, pacing).
- `lib/engine.js` — timeline, captions, brand furniture, text helpers.
- `lib/parts.js` — drawings: gears, planetary set, torque converter, CVT, dual clutch, gauges.
- `scenes/v1.js`, `v2.js`, `v3.js` — one file per reel.
- `timing.json` — word-level timings measured from the voiceover.
- `tools/` — `timing.py` (measure voiceover), `render.mjs` (frames → MP4), `audio.py` (voice + music bed), `build.sh` (all of it).

## Preview

Open `player.html?reel=v1` (or `v2`, `v3`) in a browser: it loops silently.

## Rebuild

Needs Node with Playwright/Chromium, ffmpeg, Python 3 with numpy (faster-whisper optional, for word-accurate captions).

```bash
# 1. put one voiceover file per script segment in vo/<reel>/<segment id>.mp3
# 2. optional brand mark: assets/logo.png
python3 tools/timing.py
tools/build.sh v1 v2 v3        # -> out/monaco_transmissions_<reel>.mp4
```

Without voiceover files the renderer estimates timing from the text, so
`node tools/render.mjs v1 out/v1_silent.mp4` still produces a silent cut.

## Notes

- `v2` is an illustrative simulation (same car and engine, only gearbox behaviour differs); it says so on screen.
- Captions, hook text and key labels sit inside the Reels safe area (clear of the top bar, bottom caption area and right-hand buttons).

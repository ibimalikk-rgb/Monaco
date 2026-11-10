// Single source of truth for the three reel scripts.
// `text` is what appears in captions; `say` (optional) is what is sent to TTS.
// `maxPause` / `tempo` tighten the generated voiceover (see tools/timing.py).
// Read by the browser (window.SCRIPTS) and by tools/*.py (JSON after the first "=").
window.SCRIPTS = {
  "v1": {
    "title": "How each transmission works",
    "voice": "Knox",
    "tail": 2.4,
    "maxPause": 0.2,
    "tempo": 1.16,
    "segs": [
      {"id": "hook", "text": "Four transmissions. Here's how each one actually works."},
      {"id": "manual", "text": "Manual. You're the computer. Clutch in, pick a gear, clutch out. Simple, tough, all on you."},
      {"id": "auto", "text": "Automatic. A torque converter swaps the clutch for fluid, and planetary gears shift for you."},
      {"id": "cvt", "text": "CVT. No gears at all. Two pulleys and a belt change size, so the engine stays at its most efficient.", "say": "C V T. No gears at all. Two pulleys and a belt change size, so the engine stays at its most efficient."},
      {"id": "dct", "text": "Dual clutch. One clutch holds your gear, the other has the next one ready. Shifts in milliseconds."},
      {"id": "outro", "text": "So, which one's in your driveway?"}
    ]
  },
  "v2": {
    "title": "Same engine, four gearboxes: the race",
    "voice": "Dylan",
    "tail": 2.6,
    "maxPause": 0.26,
    "tempo": 1.0,
    "segs": [
      {"id": "hook", "text": "Same engine. Four gearboxes. Who hits two hundred first?", "gap": 0.5},
      {"id": "manual", "text": "The manual loses time on every single shift. Clutch in, power off."},
      {"id": "auto", "text": "The automatic shifts quicker, but the torque converter soaks up some of the punch."},
      {"id": "cvt", "text": "The CVT never shifts at all. It just holds the engine at peak power.", "say": "The C V T never shifts at all. It just holds the engine at peak power."},
      {"id": "dct", "text": "And the dual clutch already has the next gear loaded. Shift done in a blink.", "gap": 0.7},
      {"id": "result", "text": "Dual clutch wins. Automatic right behind. And third place? Depends who's driving the manual."},
      {"id": "outro", "text": "Which one are you taking?"}
    ]
  },
  "v3": {
    "title": "The one habit that kills each transmission",
    "voice": "Jasper",
    "tail": 2.6,
    "maxPause": 0.22,
    "tempo": 1.1,
    "segs": [
      {"id": "hook", "text": "Every transmission has one habit that kills it."},
      {"id": "manual", "text": "Manual. Resting your foot on the clutch. Even light pressure wears it out. Foot off, unless you're shifting."},
      {"id": "auto", "text": "Automatic. Heat. Old fluid can't protect it. Change it on schedule, sooner if you tow."},
      {"id": "cvt", "text": "CVT. Hard launches, and the wrong fluid. Ease off the line, and only use CVT fluid.", "say": "C V T. Hard launches, and the wrong fluid. Ease off the line, and only use C V T fluid."},
      {"id": "dct", "text": "Dual clutch. Creeping in traffic. It slips the clutch, just like a manual. Leave a gap, then go."},
      {"id": "outro", "text": "Look after it, and it'll look after you. Save this for your next service."}
    ]
  }
};

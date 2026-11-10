#!/usr/bin/env python3
"""Measure the voiceover and write timing.json for the renderer.

Input : vo/<reel>/<seg>.mp3   (one file per script segment, see lib/scripts.js)
Output: vo/<reel>/<seg>.wav   (trimmed, long pauses tightened, optional tempo, 48 kHz mono)
        timing.json           ({reel: {segs: {seg: {voStart, voEnd, words[]}}}})
Word start times come from faster-whisper when it is installed; otherwise the
renderer spreads words across the segment in proportion to their length.
"""
import difflib, json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000


def scripts():
    src = (ROOT / "lib/scripts.js").read_text()
    return json.loads(src[src.index("{", src.index("window.SCRIPTS")):].rstrip().rstrip(";"))


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def trim(x, pad=0.03):
    hop = SR // 100
    rms = np.sqrt(np.array([np.mean(x[i:i + hop] ** 2) for i in range(0, len(x) - hop, hop)]) + 1e-12)
    live = np.where(rms > rms.max() * 10 ** (-38 / 20))[0]
    a = max(0, live[0] * hop - int(pad * SR)); b = min(len(x), (live[-1] + 1) * hop + int(pad * 2 * SR))
    return x[a:b]


def tighten(x, max_pause):
    """Shorten every internal silence longer than max_pause (TTS tends to linger on full stops)."""
    hop = SR // 200
    rms = np.sqrt(np.array([np.mean(x[i:i + hop] ** 2) for i in range(0, len(x) - hop, hop)]) + 1e-12)
    quiet = rms < rms.max() * 10 ** (-34 / 20)
    keep = np.ones(len(x), dtype=bool); i = 0; n = len(quiet); half = int(max_pause / 2 * SR)
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]: j += 1
            a, b = i * hop, j * hop
            if i > 0 and j < n and b - a > 2 * half: keep[a + half:b - half] = False
            i = j
        else:
            i += 1
    return x[keep]


def retime(x, tempo):
    if abs(tempo - 1) < 0.005: return x
    out = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"atempo={tempo}",
                          "-f", "f32le", "-"], input=x.astype(np.float32).tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def write_wav(path, x):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def letters(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def align(text, heard):
    """Map each script token to a start time using recognised (word, start, end) triples."""
    tok = text.split()
    ref, ref_tok = "", []
    for j, t in enumerate(tok):
        ref_tok.append(len(ref)); ref += letters(t)
    hyp, hyp_t = "", []
    for w, s, e in heard:
        l = letters(w)
        for k in range(len(l)):
            hyp_t.append(s + (e - s) * k / max(1, len(l)))
        hyp += l
    if not hyp:
        return None, 0.0
    sm = difflib.SequenceMatcher(None, ref, hyp, autojunk=False)
    m = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            m[a + k] = hyp_t[b + k]
    out = [m.get(i) for i in ref_tok]
    known = [(j, v) for j, v in enumerate(out) if v is not None]
    if not known:
        return None, 0.0
    for j, v in enumerate(out):               # fill gaps by interpolation between neighbours
        if v is None:
            prev = [(a, b) for a, b in known if a < j]; nxt = [(a, b) for a, b in known if a > j]
            if prev and nxt:
                (a, va), (b, vb) = prev[-1], nxt[0]; out[j] = va + (vb - va) * (j - a) / (b - a)
            else:
                out[j] = (prev[-1][1] if prev else nxt[0][1])
    for j in range(1, len(out)):              # keep monotonic
        out[j] = max(out[j], out[j - 1] + 0.02)
    return out, sm.ratio()


def main():
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("small.en", device="cpu", compute_type="int8")
    except Exception as e:                    # noqa: BLE001
        print("faster-whisper unavailable, using proportional word timing:", e); model = None
    timing = {}
    for rid, reel in scripts().items():
        if not (ROOT / "vo" / rid).is_dir():
            continue
        t, segs = 0.2, {}
        for s in reel["segs"]:
            x = trim(decode(ROOT / "vo" / rid / f"{s['id']}.mp3"))
            x = retime(tighten(x, reel.get("maxPause", 0.3)), reel.get("tempo", 1.0))
            wav = ROOT / "vo" / rid / f"{s['id']}.wav"; write_wav(wav, x)
            dur = len(x) / SR
            seg = {"voStart": round(t, 3), "voEnd": round(t + dur, 3)}
            note = ""
            if model:
                parts, _ = model.transcribe(str(wav), word_timestamps=True, language="en", beam_size=5)
                heard = [(w.word, w.start, w.end) for p in parts for w in p.words]
                words, ratio = align(s["text"], heard)
                note = f" match={ratio:.2f} heard=\"{''.join(w for w, _, _ in heard).strip()}\""
                if words and ratio > 0.8:
                    seg["words"] = [round(min(t + dur, t + max(0.0, v)), 3) for v in words]
            segs[s["id"]] = seg
            print(f"{rid}/{s['id']:7s} {dur:5.2f}s @ {t:6.2f}{note}")
            t += dur + s.get("gap", 0.35)
        timing[rid] = {"segs": segs}
        print(f"{rid}: speech ends {t:.2f}s, total ≈ {t - 0.35 + reel.get('tail', 1.8):.2f}s")
    (ROOT / "timing.json").write_text(json.dumps(timing, separators=(",", ":")))


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Build the soundtrack for one reel: voiceover placed on the timeline + a synthesized
music bed (kick, bass, pad, arp, hats) with whooshes/impacts on scene changes.

  python3 tools/audio.py v1            -> out/v1_mix.wav  (voice + bed)
  python3 tools/audio.py v1 --vo-only  -> out/v1_vo.wav   (voice only)
Needs timing.json and vo/<reel>/<seg>.wav from tools/timing.py. numpy only.
"""
import json, sys, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
rng = np.random.default_rng(7)

# chord voicings (MIDI) for the pad, bass roots, tempo and groove per reel
STYLE = {
    "v1": dict(bpm=100, pads=[[62, 65, 69], [58, 62, 65], [57, 60, 65], [55, 60, 64]], bass=[38, 34, 41, 36], hats=2, kick=[0, 2], drive=False),
    "v2": dict(bpm=126, pads=[[64, 67, 71], [64, 67, 72], [62, 67, 71], [62, 66, 69]], bass=[40, 36, 43, 38], hats=4, kick=[0, 1, 2, 3], drive=True),
    "v3": dict(bpm=86, pads=[[57, 60, 64], [57, 60, 65], [57, 62, 65], [56, 59, 64]], bass=[33, 41, 38, 40], hats=1, kick=[0, 2.5], drive=False),
}
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)


def scripts():
    src = (ROOT / "lib/scripts.js").read_text()
    return json.loads(src[src.index("{", src.index("window.SCRIPTS")):].rstrip().rstrip(";"))


def read_wav(p):
    with wave.open(str(p), "rb") as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768


def write_wav(p, x):
    p.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(x.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def filt(x, lo=None, hi=None):
    """Zero-phase 2nd-order high/low-pass applied in the frequency domain."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-6)) ** 4)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))


def add(buf, clip, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(clip) <= 0: return
    a = max(0, -i); n = min(len(clip) - a, len(buf) - max(i, 0))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[max(i, 0):max(i, 0) + n, 0] += clip[a:a + n] * gain * l * 1.414
    buf[max(i, 0):max(i, 0) + n, 1] += clip[a:a + n] * gain * r * 1.414


def kick():
    t = np.arange(int(0.34 * SR)) / SR
    f = 46 + 110 * np.exp(-t / 0.028)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13) + 0.25 * filt(rng.standard_normal(len(t)), lo=2500) * np.exp(-t / 0.004)


def hat(d=0.03):
    t = np.arange(int(0.12 * SR)) / SR
    return filt(rng.standard_normal(len(t)), lo=7500) * np.exp(-t / d)


def pluck(f, d=0.2):
    t = np.arange(int(0.6 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)) * np.exp(-t / d) * np.minimum(1, t / 0.004)


def bass_note(f, dur):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 0.012) * np.exp(-t / (dur * 0.9)) * np.minimum(1, (dur - t) / 0.03)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)) * env


def pad_chord(notes, dur, det):
    n = int((dur + 0.5) * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-det, 0.0, det):
            f = hz(m) * 2 ** (d / 1200)
            x += 2 * ((f * t + rng.random()) % 1) - 1
    env = np.minimum(1, t / 0.25) * np.minimum(1, (dur + 0.5 - t) / 0.5)
    return x * env / (3 * len(notes))


def whoosh(d=0.55):
    n = int((d + 0.12) * SR); t = np.arange(n) / SR; nz = rng.standard_normal(n)
    lo, hi = filt(nz, lo=300, hi=1500), filt(nz, lo=1800, hi=9000)
    k = np.clip(t / d, 0, 1)
    env = np.where(t < d, k ** 2.2, np.exp(-(t - d) / 0.03))
    return (lo * (1 - k) + hi * k) * env


def impact():
    t = np.arange(int(0.9 * SR)) / SR
    f = 36 + 50 * np.exp(-t / 0.07)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28) + 0.5 * filt(rng.standard_normal(len(t)), hi=420) * np.exp(-t / 0.09)


def riser(d):
    n = int(d * SR); t = np.arange(n) / SR; k = t / d
    tone = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (k * 2.2)) / SR) * 0.25
    return (filt(rng.standard_normal(n), lo=1200, hi=8000) * 0.8 + tone) * k ** 2.5


def bed(rid, total, tl):
    st = STYLE[rid]; beat = 60 / st["bpm"]; bar = 4 * beat
    N = int(total * SR) + SR
    drums, music = np.zeros((N, 2)), np.zeros((N, 2))
    order = [s["id"] for s in scripts()[rid]["segs"]]
    starts = [max(0.0, tl[i]["voStart"] - 0.12) for i in order]
    body0, body1 = starts[1], starts[-1]                      # groove runs from the first topic to the outro
    K, H = kick(), hat()
    nb = int(total / bar) + 2
    for b in range(nb):
        t0 = b * bar; ci = b % 4
        add(music, filt(pad_chord(st["pads"][ci], bar, 9), hi=1100), t0, 0.5, -0.25)
        add(music, filt(pad_chord(st["pads"][ci], bar, 13), hi=900), t0, 0.5, 0.25)
        for k in range(8):                                    # arp on 8ths
            tt = t0 + k * beat / 2
            note = st["pads"][ci][[0, 1, 2, 1, 2, 1, 0, 2][k]] + 12
            add(music, pluck(hz(note)), tt, 0.16 if body0 <= tt < body1 else 0.1, 0.5 if k % 2 else -0.5)
        f = hz(st["bass"][ci])
        steps = [i * beat / 2 for i in range(8)] if st["drive"] else [0, 1.5 * beat, 2 * beat, 3.5 * beat]
        for s in steps:
            tt = t0 + s
            if body0 <= tt < body1: add(music, bass_note(f, beat * (0.45 if st["drive"] else 0.9)), tt, 0.55)
        for kb in st["kick"]:
            tt = t0 + kb * beat
            if body0 <= tt < body1: add(drums, K, tt, 0.95)
        for h in range(4 * st["hats"]):
            tt = t0 + h * beat / st["hats"] + (beat / 2 if st["hats"] == 1 else 0)
            if body0 <= tt < body1 and (st["hats"] > 2 or h % 2 == 1 or st["hats"] == 1):
                add(drums, H, tt, 0.16 if h % 2 else 0.09, 0.3 * (-1) ** h)
    # duck the music under each kick so the low end stays clean
    env = np.zeros(N)
    for b in range(nb):
        for kb in st["kick"]:
            tt = b * bar + kb * beat
            if body0 <= tt < body1:
                i = int(tt * SR); n = min(int(0.22 * SR), N - i)
                if n > 0: env[i:i + n] = np.maximum(env[i:i + n], np.linspace(1, 0, n) ** 1.5)
    music *= (1 - 0.55 * env)[:, None]
    fx = np.zeros((N, 2))
    W_, I_ = whoosh(), impact()
    add(fx, I_, 0.0, 0.7)
    for s in starts[1:]:
        add(fx, W_, s - 0.55, 0.3); add(fx, I_, s, 0.55 if s != body0 else 0.85)
    if rid == "v2":                                           # build into the launch and the finish line
        add(fx, riser(min(2.2, body0 - 0.1)), body0 - min(2.2, body0 - 0.1), 0.35)
        fin = max(0.0, tl["result"]["voStart"] - 0.12)
        add(fx, riser(1.6), fin - 1.6, 0.3)
    out = drums + music + fx
    fade = np.ones(N); n = int(1.0 * SR); e = int(total * SR)
    fade[e - n:e] = np.linspace(1, 0, n) ** 1.5; fade[e:] = 0
    return (out * fade[:, None])[:e]


def main():
    rid = sys.argv[1]; vo_only = "--vo-only" in sys.argv
    tl = json.loads((ROOT / "timing.json").read_text())[rid]["segs"]
    reel = scripts()[rid]
    total = tl[reel["segs"][-1]["id"]]["voEnd"] + reel.get("tail", 1.8)
    N = int(total * SR)
    vo = np.zeros(N)
    for s in reel["segs"]:
        x = filt(read_wav(ROOT / "vo" / rid / f"{s['id']}.wav"), lo=75)
        loud = np.sqrt(np.mean(np.sort(x ** 2)[len(x) // 3:]))          # RMS of the louder two thirds
        x *= 10 ** (-19 / 20) / max(loud, 1e-6)
        i = int(tl[s["id"]]["voStart"] * SR); n = min(len(x), N - i)
        vo[i:i + n] += x[:n]
    vo = np.tanh(vo * 1.25) / 1.25
    mix = np.stack([vo, vo], axis=1)
    if not vo_only:
        b = bed(rid, total, tl)[:N]
        # sidechain: pull the bed down while the voice is speaking
        hop = SR // 100
        e = np.sqrt(np.convolve(vo ** 2, np.ones(hop * 12) / (hop * 12), mode="same"))
        duck = 1 - 0.5 * np.clip(e / 0.06, 0, 1)
        ref = np.sqrt(np.mean(b ** 2)) + 1e-9
        b *= (10 ** (-27 / 20) / ref) * duck[:, None]
        mix = mix + b
    mix = np.tanh(mix * 1.1) / 1.1
    out = ROOT / "out" / f"{rid}_{'vo' if vo_only else 'mix'}.wav"
    write_wav(out, mix)
    print(f"{out.name}: {total:.2f}s  peak {np.abs(mix).max():.2f}  rms {20 * np.log10(np.sqrt(np.mean(mix ** 2)) + 1e-9):.1f} dBFS")


if __name__ == "__main__":
    main()

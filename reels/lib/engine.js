'use strict';
// Monaco Auto reel engine: deterministic canvas renderer. Every frame is a pure
// function of time, so the same code drives the browser preview and the MP4 render.
const W = 1080, H = 1920, FPS = 30;
const COL = {
  bg0: '#040a1c', bg1: '#0a1c48', blue: '#334fb4', sky: '#6378ab', ice: '#b9c8f2',
  white: '#ffffff', panel: '#0c1738', line: 'rgba(185,200,242,.16)',
  manual: '#ff9f43', auto: '#5b8cff', cvt: '#2fd6a3', dct: '#ff5470',
  bad: '#ff4d4d', good: '#3ddc84', gold: '#ffd166',
};
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, start, dur) => clamp((t - start) / dur);
const eo3 = x => 1 - Math.pow(1 - x, 3);
const eio = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eback = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
// deterministic pseudo-random in [0,1)
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = k => Math.round(lerp((a >> k) & 255, (b >> k) & 255, clamp(t)));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

// ---------- text ----------
function font(ctx, size, weight = 800) { ctx.font = `${weight} ${size}px Inter, "Liberation Sans", sans-serif`; }
function txt(ctx, s, x, y, o = {}) {
  ctx.save();
  font(ctx, o.size || 48, o.weight || 800);
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.base || 'alphabetic';
  ctx.letterSpacing = `${o.ls ?? Math.round((o.size || 48) * -0.02)}px`;
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur ?? 28; }
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.sw || 10; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.color || COL.white;
  ctx.fillText(s, x, y);
  ctx.restore();
}
function measure(ctx, s, size, weight = 800, ls) {
  ctx.save(); font(ctx, size, weight); ctx.letterSpacing = `${ls ?? Math.round(size * -0.02)}px`;
  const w = ctx.measureText(s).width; ctx.restore(); return w;
}
// largest size (<= max) at which the string fits in `width`
function fit(ctx, s, width, max, weight = 900, ls) {
  const w = measure(ctx, s, max, weight, ls);
  return w <= width ? max : Math.floor(max * width / w);
}
// draw fn with a pop-in transform around (x, y); p in 0..1
function pop(ctx, x, y, p, fn, from = 0.7) {
  if (p <= 0) return;
  const e = eback(clamp(p));
  ctx.save(); ctx.globalAlpha *= clamp(p * 3);
  ctx.translate(x, y); ctx.scale(lerp(from, 1, e), lerp(from, 1, e)); ctx.translate(-x, -y);
  fn(); ctx.restore();
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
// pill chip, centred on (x, y)
function chip(ctx, s, x, y, col, o = {}) {
  const size = o.size || 34, padX = o.padX ?? size * 0.7, h = size * 1.9;
  const w = measure(ctx, s, size, 800, 1) + padX * 2;
  ctx.save();
  rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  if (o.solid) { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 26; ctx.fill(); }
  else { ctx.fillStyle = hexA(col, 0.14); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke(); }
  ctx.restore();
  txt(ctx, s, x, y + size * 0.36, { size, weight: 800, ls: 1, color: o.solid ? (o.ink || COL.bg0) : COL.white });
  return w;
}
// row of chips centred on x; ps[i] is each chip's pop progress
function chipRow(ctx, labels, x, y, col, ps, o = {}) {
  const size = o.size || 34, gap = o.gap ?? 16;
  const ws = labels.map(l => measure(ctx, l, size, 800, 1) + size * 1.4);
  let cx = x - (ws.reduce((a, b) => a + b, 0) + gap * (labels.length - 1)) / 2;
  labels.forEach((l, i) => {
    const mx = cx + ws[i] / 2;
    pop(ctx, mx, y, ps[i], () => chip(ctx, l, mx, y, Array.isArray(col) ? col[i] : col, o));
    cx += ws[i] + gap;
  });
}
function check(ctx, x, y, r, col, p = 1) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 22; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = COL.bg0; ctx.lineWidth = r * 0.24; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pts = [[-0.42, 0.02], [-0.12, 0.32], [0.44, -0.3]];
  ctx.beginPath(); ctx.moveTo(x + pts[0][0] * r, y + pts[0][1] * r);
  const a = clamp(p * 2), b = clamp(p * 2 - 1);
  ctx.lineTo(x + lerp(pts[0][0], pts[1][0], a) * r, y + lerp(pts[0][1], pts[1][1], a) * r);
  if (b > 0) ctx.lineTo(x + lerp(pts[1][0], pts[2][0], b) * r, y + lerp(pts[1][1], pts[2][1], b) * r);
  ctx.stroke(); ctx.restore();
}
function cross(ctx, x, y, r, col) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 22; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = COL.bg0; ctx.lineWidth = r * 0.24; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - r * 0.36, y - r * 0.36); ctx.lineTo(x + r * 0.36, y + r * 0.36);
  ctx.moveTo(x + r * 0.36, y - r * 0.36); ctx.lineTo(x - r * 0.36, y + r * 0.36); ctx.stroke(); ctx.restore();
}

// ---------- timing ----------
const tokenize = s => s.trim().split(/\s+/);
function tokWeight(w) {
  const core = w.replace(/[^A-Za-z0-9']/g, '');
  let k = core.length + 1;
  if (/^[A-Z]{2,4}$/.test(core)) k = core.length * 3 + 1;     // spelled-out acronyms
  if (/[.?!]$/.test(w)) k += 7; else if (/[,:;]$/.test(w)) k += 4;
  return k;
}
// inj = {segs:{id:{voStart,voEnd}}} measured from the real voiceover; without it
// durations are estimated from the text so the reel can be previewed silently.
function buildTiming(reel, inj) {
  const lead = 0.12, order = [], segs = {};
  let t = 0.2;
  reel.segs.forEach((s, i) => {
    const toks = tokenize(s.text), wts = toks.map(tokWeight), tot = wts.reduce((a, b) => a + b, 0);
    let voStart, voEnd;
    if (inj && inj.segs && inj.segs[s.id]) ({ voStart, voEnd } = inj.segs[s.id]);
    else { voStart = t; voEnd = t + tot / 17.5; }
    t = voEnd + (s.gap ?? 0.35);
    let acc = 0;
    // word start times: measured (speech recognition on the voiceover) when available, else proportional
    const meas = inj && inj.segs && inj.segs[s.id] && inj.segs[s.id].words;
    const words = toks.map((w, j) => {
      const t0 = voStart + (voEnd - voStart) * acc / tot; acc += wts[j];
      return { w, t0, t1: voStart + (voEnd - voStart) * acc / tot };
    });
    if (meas && meas.length === words.length) words.forEach((w, j) => { w.t0 = j ? meas[j] : voStart; w.t1 = j + 1 < words.length ? meas[j + 1] : voEnd; });
    const chunks = []; let cur = [], len = 0;
    words.forEach(w => {
      cur.push(w); len += w.w.length + 1;
      if (/[.?!,:;]$/.test(w.w) || cur.length >= 4 || len >= 19) { chunks.push(cur); cur = []; len = 0; }
    });
    if (cur.length) { if (cur.length === 1 && chunks.length && chunks[chunks.length - 1].length < 4 && !/[.?!]$/.test(chunks[chunks.length - 1].slice(-1)[0].w)) chunks[chunks.length - 1].push(cur[0]); else chunks.push(cur); }
    const g = { id: s.id, i, voStart, voEnd, words, chunks: chunks.map(c => ({ words: c, t0: c[0].t0, t1: c[c.length - 1].t1 })), start: voStart - lead };
    segs[s.id] = g; order.push(g);
  });
  order.forEach((g, i) => {
    if (i === 0) g.start = 0;
    g.end = i < order.length - 1 ? order[i + 1].start : g.voEnd + (reel.tail ?? 1.8);
    g.dur = g.end - g.start;
  });
  const TL = { segs, order, total: order[order.length - 1].end };
  // time at which the nth word starting with `word` is spoken in segment `id`
  TL.cue = (id, word, n = 0, off = 0) => {
    const g = segs[id], k = word.toLowerCase(); let c = 0;
    for (const w of g.words) if (w.w.toLowerCase().replace(/[^a-z0-9']/g, '').startsWith(k) && c++ === n) return w.t0 + off;
    console.warn('cue not found', id, word); return g.voStart + off;
  };
  TL.at = t => order.find(g => t < g.end) || order[order.length - 1];
  return TL;
}

// ---------- shared furniture ----------
let _bg = null;
function background(ctx, t, accent) {
  if (!_bg) {
    _bg = document.createElement('canvas'); _bg.width = W; _bg.height = H;
    const b = _bg.getContext('2d');
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#071435'); g.addColorStop(0.45, COL.bg1); g.addColorStop(1, COL.bg0);
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    b.strokeStyle = 'rgba(150,175,255,.055)'; b.lineWidth = 2;
    for (let x = 0; x <= W; x += 90) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, H); b.stroke(); }
    for (let y = 30; y <= H; y += 90) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
    const v = b.createRadialGradient(W / 2, H * 0.46, 300, W / 2, H * 0.46, 1250);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.62)');
    b.fillStyle = v; b.fillRect(0, 0, W, H);
  }
  ctx.drawImage(_bg, 0, 0);
  const gx = W / 2 + Math.sin(t * 0.35) * 160, gy = 900 + Math.cos(t * 0.27) * 120;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 760);
  g.addColorStop(0, hexA(accent, 0.2)); g.addColorStop(1, hexA(accent, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
let LOGO = null;                       // optional brand mark (assets/logo.png)
const LOGO_BOX = [187, 216, 620, 266]; // opaque area inside the 960x720 file
function logo(ctx, cx, cy, w, alpha = 1) {
  if (!LOGO) return 0;
  const h = w * LOGO_BOX[3] / LOGO_BOX[2];
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.drawImage(LOGO, ...LOGO_BOX, cx - w / 2, cy - h / 2, w, h); ctx.restore();
  return h;
}
// small brand bug + per-segment progress dashes at the top of every frame
function chrome(ctx, t, TL, accent) {
  const y = 214;
  if (LOGO) { logo(ctx, 396, y - 10, 92, 0.95); txt(ctx, 'MONACO AUTO', 462, y, { size: 30, weight: 800, ls: 7, align: 'left', alpha: 0.95 }); }
  else txt(ctx, 'MONACO AUTO', W / 2, y, { size: 30, weight: 800, ls: 7, alpha: 0.95 });
  const n = TL.order.length, gap = 10, x0 = 90, wAll = W - 180, w = (wAll - gap * (n - 1)) / n;
  TL.order.forEach((g, i) => {
    const x = x0 + i * (w + gap);
    rrect(ctx, x, 252, w, 7, 4); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill();
    const p = prog(t, g.start, g.dur);
    if (p > 0) { rrect(ctx, x, 252, Math.max(7, w * p), 7, 4); ctx.fillStyle = p >= 1 ? 'rgba(255,255,255,.8)' : accent; ctx.fill(); }
  });
}
// verbatim caption: one short chunk at a time, current word in the accent colour
function caption(ctx, t, TL, accent, y = 1408) {
  const g = TL.order.find(s => t >= s.voStart - 0.05 && t <= s.voEnd + 0.28);
  if (!g) return;
  let c = g.chunks[0];
  for (const k of g.chunks) if (t >= k.t0 - 0.04) c = k;
  const words = c.words.map(w => w.w.toUpperCase());
  const size = fit(ctx, words.join(' '), 880, 66, 900, 0);
  const p = eo3(prog(t, c.t0 - 0.04, 0.14));
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(lerp(0.9, 1, p), lerp(0.9, 1, p)); ctx.globalAlpha = clamp(p * 2);
  const space = measure(ctx, ' ', size, 900, 0), ws = words.map(w => measure(ctx, w, size, 900, 0));
  let x = -(ws.reduce((a, b) => a + b, 0) + space * (words.length - 1)) / 2;
  words.forEach((w, i) => {
    const wd = c.words[i], now = t >= wd.t0 - 0.03 && t < wd.t1, said = t >= wd.t0 - 0.03;
    txt(ctx, w, x, 0, { size, weight: 900, ls: 0, align: 'left', color: now ? accent : COL.white, alpha: said ? 1 : 0.42, stroke: 'rgba(3,8,24,.92)', sw: 14 });
    x += ws[i] + space;
  });
  ctx.restore();
}
// section header: eyebrow, big title, sub line
function header(ctx, o) {
  const p = o.p ?? 1;
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(p * 2.5);
  const dx = (1 - eo3(clamp(p))) * -60;
  if (o.eyebrow) txt(ctx, o.eyebrow, 90 + dx, 350, { size: 34, weight: 800, ls: 6, align: 'left', color: o.color || COL.ice });
  const size = fit(ctx, o.title, 900, o.size || 150, 900);
  txt(ctx, o.title, 84 + dx, 350 + size * 0.98, { size, weight: 900, align: 'left' });
  if (o.sub) txt(ctx, o.sub, 90 + dx, 350 + size * 0.98 + 66, { size: 38, weight: 600, ls: 2, align: 'left', color: COL.ice });
  ctx.restore();
}
// scene envelope: fade/slide in at seg start, quick fade at seg end
function sceneAlpha(t, g, fin = 0.28, fout = 0.16) { return Math.min(prog(t, g.start, fin), 1 - prog(t, g.end - fout, fout)); }
function endCard(ctx, p, cy, handle = '@monacoautopartsinc') {
  if (p <= 0) return;
  pop(ctx, W / 2, cy, p, () => {
    const h = logo(ctx, W / 2, cy - 96, 330);
    txt(ctx, 'MONACO AUTO', W / 2, cy + (h ? 50 : 0), { size: 72, weight: 900, ls: 10 });
    txt(ctx, 'PREMIUM AFTERMARKET PARTS', W / 2, cy + (h ? 104 : 54), { size: 30, weight: 600, ls: 8, color: COL.ice });
    chip(ctx, handle, W / 2, cy + (h ? 186 : 136), COL.white, { size: 36, solid: true });
  }, 0.85);
}

// ---------- runtime ----------
const REELS = {};
let ctx = null, TL = null, reel = null;
function renderAt(t) {
  t = clamp(t, 0, TL.total);
  const g = TL.at(t), accent = reel.accent(g.id);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  background(ctx, t, accent);
  reel.draw(ctx, t, TL, g);
  chrome(ctx, t, TL, accent);
  caption(ctx, t, TL, accent, reel.captionY || 1408);
  if (window.GUIDES) { ctx.fillStyle = 'rgba(255,0,0,.12)'; ctx.fillRect(0, 0, W, 190); ctx.fillRect(0, H - 420, W, 420); ctx.fillRect(W - 110, 900, 110, 600); }
}
async function boot() {
  const id = new URLSearchParams(location.search).get('reel') || 'v1';
  reel = REELS[id]; reel.segs = window.SCRIPTS[id].segs; reel.tail = window.SCRIPTS[id].tail;
  const cv = document.getElementById('c'); ctx = cv.getContext('2d');
  await Promise.all(['600', '800', '900'].map(w => document.fonts.load(`${w} 40px Inter`)));
  LOGO = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'assets/logo.png'; });
  TL = buildTiming(reel, (window.TIMING || {})[id]);
  if (reel.init) reel.init(TL);
  window.DURATION = TL.total; window.TL = TL;
  window.frameJPEG = (t, q = 0.95) => { renderAt(t); return cv.toDataURL('image/jpeg', q).slice(23); };
  renderAt(0);
  if (!window.HEADLESS) {             // live preview loop in a normal browser tab
    const t0 = performance.now();
    const loop = () => { renderAt(((performance.now() - t0) / 1000) % TL.total); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  window.READY = true;
}
window.addEventListener('load', boot);

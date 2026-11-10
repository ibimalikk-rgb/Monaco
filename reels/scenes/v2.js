'use strict';
// V2 — "Same engine, four gearboxes": a 0-200 km/h run driven by a small physics model.
// Same car and engine in every lane; only the gearbox behaviour changes. Illustrative, not test data.
(function () {
  const LN = [{ k: 'manual', name: 'MANUAL' }, { k: 'auto', name: 'AUTOMATIC' }, { k: 'cvt', name: 'CVT' }, { k: 'dct', name: 'DUAL CLUTCH' }];
  const RPM_PK = 6500, RED = 6800, PMAX = 235e3, MASS = 1550, AMAX = 6.5, VT = 200 / 3.6, DT = 1 / 240, HZ = 60;
  const CFG = {
    manual: { top: [58, 98, 142, 196, 245, 295], shift: 0.6, hold: 0, eff: 0.94, launch: 3800 },   // power fully off while the clutch is in
    auto: { top: [44, 70, 100, 134, 172, 212, 260, 310], shift: 0.28, hold: 0.35, eff: 0.9, launch: 2800 },
    cvt: { eff: 0.86 },                                                                              // no steps; belt losses instead
    dct: { top: [50, 82, 118, 158, 202, 250, 300], shift: 0.09, hold: 0.6, eff: 0.93, launch: 4200 },
  };
  const pw = x => clamp(1.5 * x - 0.5 * x * x * x, 0, 1);       // power vs rpm, peak at RPM_PK
  function sim(c) {
    let v = 0, g = 0, ts = -1, rf = 0, t = 0, fin = null, next = 0; const s = [];
    while (t < 45) {
      let rpm, pf = 1, sh = false;
      const nat = c.top ? v * 3.6 / c.top[g] * RPM_PK : 0;
      if (!c.top) rpm = lerp(3000, 6400, eo3(clamp(t / 1.5)));
      else if (ts >= 0) { const k = (t - ts) / c.shift; rpm = lerp(rf, nat, eio(clamp(k))); pf = c.hold; sh = true; if (k >= 1) ts = -1; }
      else { rpm = Math.max(nat, c.launch); if (nat >= RED && g < c.top.length - 1) { ts = t; rf = nat; g++; } }
      const a = Math.min(c.eff * PMAX * pw(rpm / RPM_PK) * pf / (MASS * Math.max(v, 2)), AMAX) - (0.5 * 1.2 * 0.66 * v * v + 190) / MASS;
      if (t >= next) { s.push({ v: v * 3.6, rpm, g: g + 1, sh }); next += 1 / HZ; }
      v = Math.max(0, v + a * DT); t += DT;
      if (fin === null && v >= VT) fin = t;
      if (fin !== null && t > fin + 0.4) break;
    }
    return { s, fin };
  }
  let R = null, tGo = 0, kT = 1, tMax = 1, order = [];
  function init(TL) {
    R = {}; for (const l of LN) if (l.k !== 'cvt') R[l.k] = sim(CFG[l.k]);
    // the CVT's belt efficiency is set so it lands level with the manual: third place is a photo finish
    let lo = 0.8, hi = 0.95;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (sim({ eff: m }).fin > R.manual.fin - 0.02) lo = m; else hi = m; }
    R.cvt = sim({ eff: (lo + hi) / 2 });
    tGo = TL.segs.manual.start;
    kT = R.dct.fin / (TL.segs.result.voStart - tGo);            // race seconds per video second: the winner crosses as the result line starts
    tMax = Math.max(...LN.map(l => R[l.k].fin)) + 0.25;
    order = LN.map(l => l.k).sort((a, b) => R[a].fin - R[b].fin);
    window.RACE = Object.fromEntries(LN.map(l => [l.k, +R[l.k].fin.toFixed(2)]));
  }
  const sample = (k, tr) => {
    const r = R[k], done = tr >= r.fin, i = clamp(Math.floor(Math.min(tr, r.fin) * HZ), 0, r.s.length - 1);
    return done ? { ...r.s[i], v: 200, sh: false, done } : { ...r.s[i], done: false };
  };

  const X0 = 60, LW = 960, Y0 = 604, LH = 172, GAP = 12, TX0 = 250, TX1 = 800;
  function lane(ctx, i, t, tr, focus, live) {
    const k = LN[i].k, col = COL[k], y = Y0 + i * (LH + GAP), s = sample(k, Math.max(0, tr)), on = focus === i;
    ctx.save(); ctx.globalAlpha *= focus < 0 || on ? 1 : 0.5;
    ctx.save(); rrect(ctx, X0, y, LW, LH, 28); ctx.fillStyle = 'rgba(9,18,46,.84)';
    if (on) { ctx.shadowColor = col; ctx.shadowBlur = 34; } ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = on ? 5 : 3; ctx.strokeStyle = hexA(col, on ? 1 : 0.55); ctx.stroke(); ctx.restore();
    txt(ctx, LN[i].name, X0 + 26, y + 52, { size: 34, weight: 900, align: 'left', color: col, ls: 0 });
    txt(ctx, k === 'cvt' ? 'RATIO' : 'GEAR', X0 + 28, y + 90, { size: 20, weight: 800, ls: 4, align: 'left', color: COL.ice });
    txt(ctx, k === 'cvt' ? '∞' : String(live ? s.g : 1), X0 + 26, y + 152, { size: 64, weight: 900, align: 'left', color: s.sh ? col : COL.white });
    if (s.sh && k !== 'dct') txt(ctx, k === 'manual' ? 'POWER OFF' : 'SHIFT', X0 + 84, y + 146, { size: 21, weight: 900, ls: 2, align: 'left', color: k === 'manual' ? COL.bad : col });
    // speed track
    const ty = y + 50, p = clamp(s.v / 200);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(185,200,242,.18)';
    ctx.beginPath(); ctx.moveTo(TX0, ty); ctx.lineTo(TX1, ty); ctx.stroke();
    ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(TX0, ty); ctx.lineTo(lerp(TX0 + 4, TX1, p), ty); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = COL.white; for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) if ((r + c) % 2 === 0) ctx.fillRect(TX1 + 2 + c * 7, ty - 14 + r * 7, 7, 7);
    ctx.restore();
    drawCar(ctx, lerp(TX0 + 92, TX1, p), ty + 6, 0.42, col, { spin: tr * 14 * p + i, glow: 12 });
    // rpm trace
    const gy0 = y + 76, gh = 80, gx = tt => lerp(TX0, TX1, tt / tMax), gy = rpm => gy0 + gh - clamp((rpm - 1500) / 5600) * gh;
    ctx.save(); ctx.strokeStyle = 'rgba(185,200,242,.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(TX0, gy0 + gh); ctx.lineTo(TX1, gy0 + gh); ctx.stroke();
    ctx.setLineDash([6, 8]); ctx.strokeStyle = hexA(COL.bad, 0.5); ctx.beginPath(); ctx.moveTo(TX0, gy(RED)); ctx.lineTo(TX1, gy(RED)); ctx.stroke(); ctx.setLineDash([]);
    if (live && tr > 0) {
      const r = R[k], n = Math.floor(Math.min(tr, r.fin) * HZ);
      ctx.beginPath(); for (let j = 0; j <= n; j += 2) ctx.lineTo(gx(j / HZ), gy(r.s[Math.min(j, r.s.length - 1)].rpm));
      const hx = gx(Math.min(tr, r.fin)), hy = gy(s.rpm); ctx.lineTo(hx, hy);
      ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.lineTo(hx, gy0 + gh); ctx.lineTo(TX0, gy0 + gh); ctx.closePath(); ctx.fillStyle = hexA(col, 0.13); ctx.fill();
      ctx.beginPath(); ctx.arc(hx, hy, 7, 0, TAU); ctx.fillStyle = COL.white; ctx.fill();
    }
    ctx.restore();
    txt(ctx, 'RPM', TX0 + 4, gy0 + 20, { size: 18, weight: 800, ls: 3, align: 'left', color: 'rgba(185,200,242,.5)' });
    // speed readout / finishing position
    txt(ctx, String(Math.round(s.v)), X0 + LW - 26, y + 84, { size: 72, weight: 900, align: 'right', color: s.done ? col : COL.white });
    txt(ctx, 'KM/H', X0 + LW - 28, y + 112, { size: 20, weight: 800, ls: 4, align: 'right', color: COL.ice });
    if (s.done) {
      const pos = order.indexOf(k), lab = pos === 0 ? '1ST' : pos === 1 ? '2ND' : 'PHOTO FINISH', bc = pos === 0 ? COL.gold : pos === 1 ? COL.white : col;
      const bp = prog(tr, R[k].fin, 0.25 * kT), bx = X0 + LW - 26 - (measure(ctx, lab, 22, 800, 1) + 31) / 2;
      pop(ctx, bx, y + 144, bp, () => chip(ctx, lab, bx, y + 144, bc, { size: 22, solid: pos < 2 }));
    }
    ctx.restore();
  }
  function lights(ctx, t, g) {
    const n = 5, lit = Math.floor(prog(t, g.start + 0.15, tGo - 0.45 - g.start) * n + 0.001), go = t >= tGo;
    for (let i = 0; i < n; i++) {
      const x = W / 2 + (i - 2) * 76, c = go ? COL.good : i < lit ? COL.bad : null;
      ctx.save(); ctx.beginPath(); ctx.arc(x, 532, 24, 0, TAU); ctx.fillStyle = c || '#0e1b40'; if (c) { ctx.shadowColor = c; ctx.shadowBlur = 34; } ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(185,200,242,.4)'; ctx.stroke(); ctx.restore();
    }
  }
  const CALL = { manual: 'MANUAL: POWER CUTS ON EVERY SHIFT', auto: 'AUTOMATIC: QUICK SHIFTS, CONVERTER LOSSES', cvt: 'CVT: NO SHIFTS, PINNED AT PEAK POWER', dct: 'DUAL CLUTCH: NEXT GEAR PRE-LOADED' };

  REELS.v2 = {
    captionY: 1440, init,
    accent: id => ({ hook: COL.gold, manual: COL.manual, auto: COL.auto, cvt: COL.cvt, dct: COL.dct, result: COL.dct, outro: COL.gold }[id]),
    draw(ctx, t, TL, g) {
      const tr = (t - tGo) * kT, live = t >= tGo, id = g.id, S = TL.segs;
      const outro = id === 'outro' ? eio(prog(t, g.start, 0.4)) : 0;
      // header
      txt(ctx, 'SAME ENGINE · SAME CAR · 4 GEARBOXES', 90, 350, { size: 30, weight: 800, ls: 3, align: 'left', color: COL.gold });
      if (live && !outro) txt(ctx, (Math.min(tr, tMax)).toFixed(1) + ' s', 990, 350, { size: 34, weight: 900, align: 'right', ls: 0 });
      const resP = prog(t, S.result.start, 0.3);
      if (outro > 0) pop(ctx, W / 2, 430, outro, () => { txt(ctx, 'WHICH ONE', W / 2, 432, { size: 104, weight: 900 }); txt(ctx, 'ARE YOU TAKING?', W / 2, 540, { size: 104, weight: 900, color: COL.gold }); }, 0.85);
      else if (resP > 0) pop(ctx, W / 2, 440, resP, () => txt(ctx, 'DUAL CLUTCH WINS', W / 2, 452, { size: 96, weight: 900, color: COL.dct, glow: COL.dct }));
      else pop(ctx, W / 2, 440, 0.6 + 0.4 * prog(t, 0, 0.3), () => txt(ctx, 'WHO HITS 200 FIRST?', W / 2, 452, { size: 90, weight: 900 }));
      const fo = 1 - prog(t, tGo + 0.5, 0.3);
      if (fo > 0) { ctx.save(); ctx.globalAlpha *= fo; lights(ctx, t, S.hook); ctx.restore(); }
      let call = null, ccol = COL.white, c0 = 0;
      if (CALL[id]) { call = CALL[id]; ccol = COL[id]; c0 = Math.max(g.start, tGo + 0.8); }
      else if (id === 'result') {
        const cA = TL.cue('result', 'automatic'), cT = TL.cue('result', 'third');
        if (t >= cT) { call = '3RD PLACE: TOO CLOSE TO CALL'; ccol = COL.gold; c0 = cT; } else if (t >= cA) { call = 'AUTOMATIC: RIGHT BEHIND'; ccol = COL.auto; c0 = cA; }
      }
      if (call) { const cp = Math.min(prog(t, c0, 0.25), 1 - prog(t, g.end - 0.12, 0.12)); pop(ctx, W / 2, 532, cp, () => chip(ctx, call, W / 2, 532, ccol, { size: 30, solid: true })); }
      // lanes
      const focus = { manual: 0, auto: 1, cvt: 2, dct: 3 }[id] ?? -1;
      ctx.save(); ctx.globalAlpha *= 1 - 0.82 * outro;
      LN.forEach((_, i) => lane(ctx, i, t, tr, t >= tGo + 0.8 ? focus : -1, live));
      txt(ctx, 'Illustrative simulation: same engine and car, only the gearbox changes.', W / 2, 1362, { size: 23, weight: 600, ls: 0, color: COL.ice, alpha: 0.6 });
      ctx.restore();
      if (outro > 0) {
        const ep = prog(t, g.voEnd + 0.1, 0.4);
        endCard(ctx, ep, 930);
        pop(ctx, W / 2, 1230, prog(t, g.voEnd + 0.5, 0.3), () => chip(ctx, 'COMMENT YOURS  +  FOLLOW FOR MORE', W / 2, 1230, COL.gold, { size: 30 }));
      }
    },
  };
})();

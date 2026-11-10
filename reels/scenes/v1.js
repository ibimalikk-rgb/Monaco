'use strict';
// V1 — "How each one actually works": one mechanism animation per transmission.
(function () {
  const KEYS = ['manual', 'auto', 'cvt', 'dct'], NAMES = ['MANUAL', 'AUTOMATIC', 'CVT', 'DUAL CLUTCH'];
  const PCOL = { sun: COL.auto, planet: COL.ice, ring: '#8fa8ff', carrier: COL.gold };
  // numeric integral of f over [a, b]; cheap enough to run every frame
  const integ = (f, a, b) => { let s = 0; const n = Math.max(1, Math.ceil((b - a) / 0.01)), h = (b - a) / n; for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h) * h; return s; };

  function icon(ctx, key, cx, cy, t, s = 1) {
    if (key === 'manual') drawShifter(ctx, cx, cy, 0.7 * s, gatePos(1, 2, eio((Math.sin(t * 2.4) + 1) / 2)), COL.manual, 0);
    else if (key === 'auto') drawPlanetary(ctx, cx, cy, 88 * s, t * 2.2, PCOL, { lw: 3 });
    else if (key === 'cvt') drawCVT(ctx, cx, cy, 0.43 * s, (Math.sin(t * 1.3 - 1.2) + 1) / 2, t * 150, COL.cvt);
    else {
      const k = eio((Math.sin(t * 3) + 1) / 2);
      [[-62, k], [62, 1 - k]].forEach(([dx, c], i) => {
        const gap = lerp(30, 9, c) * s;
        for (const sg of [-1, 1]) {
          ctx.save(); rrect(ctx, cx + dx * s + sg * gap - 9 * s, cy - 70 * s, 18 * s, 140 * s, 8 * s);
          ctx.fillStyle = c > 0.5 ? COL.dct : '#0e1b40'; ctx.shadowColor = COL.dct; ctx.shadowBlur = c > 0.5 ? 30 : 0; ctx.fill();
          ctx.shadowBlur = 0; ctx.lineWidth = 4; ctx.strokeStyle = COL.dct; ctx.stroke(); ctx.restore();
        }
        txt(ctx, String(i + 1), cx + dx * s, cy + 112 * s, { size: 30 * s, weight: 900, color: c > 0.5 ? COL.white : 'rgba(185,200,242,.5)' });
      });
    }
  }
  function tiles(ctx, t, y0, h, ps) {
    const w = 440, gx = 24, gy = 22, x0 = (W - 2 * w - gx) / 2;
    KEYS.forEach((k, i) => {
      const x = x0 + (i % 2) * (w + gx), y = y0 + Math.floor(i / 2) * (h + gy), cx = x + w / 2, cy = y + h / 2;
      pop(ctx, cx, cy, ps[i], () => {
        ctx.save(); rrect(ctx, x, y, w, h, 34); ctx.fillStyle = 'rgba(9,18,46,.82)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = hexA(COL[k], 0.75); ctx.stroke(); ctx.restore();
        icon(ctx, k, cx, y + (h - 62) / 2 + 4, t, h / 318);
        txt(ctx, NAMES[i], cx, y + h - 28, { size: 38, weight: 900, ls: 2, color: COL[k] });
      }, 0.8);
    });
  }

  const scenes = {
    hook(ctx, t, TL, g) {
      const cHere = TL.cue('hook', 'here');
      pop(ctx, W / 2, 420, 0.55 + 0.45 * prog(t, 0, 0.3), () => txt(ctx, '4 TRANSMISSIONS', W / 2, 456, { size: 108, weight: 900 }));
      const hl = prog(t, cHere, 0.25);
      txt(ctx, 'HOW EACH ONE ACTUALLY WORKS', W / 2, 536, { size: 47, weight: 800, ls: 3, color: mix(COL.ice, COL.gold, hl), alpha: 0.75 + 0.25 * hl });
      tiles(ctx, t, 610, 318, KEYS.map((_, i) => 0.35 + 0.65 * prog(t, 0.04 + i * 0.09, 0.3)));
    },

    manual(ctx, t, TL, g) {
      header(ctx, { eyebrow: '01 / 04', title: 'MANUAL', sub: 'You do the shifting.', color: COL.manual, p: prog(t, g.start, 0.35) });
      const cIn = TL.cue('manual', 'clutch', 0), cPick = TL.cue('manual', 'pick'), cOut = TL.cue('manual', 'clutch', 1), cS = TL.cue('manual', 'simple');
      const shifts = [{ in: cIn, mv: cPick, md: Math.max(0.3, cOut - cPick - 0.05), out: cOut, from: 1, to: 2 }, { in: cS + 0.25, mv: cS + 0.45, md: 0.38, out: cS + 0.9, from: 2, to: 3 }];
      const RAT = { 1: [12, 30], 2: [16, 26], 3: [20, 22] };
      let gear = 1, press = 0, pos = GATE[1], dip = 0;
      for (const s of shifts) if (t >= s.in) {
        press = t < s.out ? eo3(prog(t, s.in, 0.2)) : 1 - eo3(prog(t, s.out, 0.22));
        const mp = eio(prog(t, s.mv, s.md)); pos = gatePos(s.from, s.to, mp); gear = mp > 0.5 ? s.to : s.from; dip = Math.sin(Math.PI * mp);
      }
      const cy = 822, [n1, n2] = RAT[gear];
      ctx.save(); ctx.globalAlpha *= 1 - 0.75 * dip;
      const gp = drawGearPair(ctx, W / 2, cy, 14, n1, n2, t * 2.6, press * 44, COL.ice, COL.manual);
      ctx.restore();
      chip(ctx, 'ENGINE', gp.x1, cy - gp.r1 - 58, COL.ice, { size: 26 });
      chip(ctx, 'WHEELS', gp.x2, cy + gp.r2 + 54, COL.manual, { size: 26 });
      pop(ctx, 700, 610, prog(t, g.start + 0.3, 0.3), () => txt(ctx, 'GEAR ' + gear, 992, 640, { size: 44, weight: 900, align: 'right', color: COL.manual }));
      drawShifter(ctx, 236, 1196, 0.76, pos, COL.manual, gear);
      drawPedal(ctx, 880, 1186, 0.7, press, COL.manual, 'CLUTCH');
      const ps = ['simple', 'tough', 'all'].map(w => prog(t, TL.cue('manual', w), 0.25));
      ['SIMPLE', 'TOUGH', 'ALL ON YOU'].forEach((l, i) => pop(ctx, 566, 1126 + i * 70, ps[i], () => chip(ctx, l, 566, 1126 + i * 70, COL.manual, { size: 30, solid: i === 2 })));
    },

    auto(ctx, t, TL, g) {
      header(ctx, { eyebrow: '02 / 04', title: 'AUTOMATIC', sub: 'Fluid and planetary gears do it.', color: COL.auto, p: prog(t, g.start, 0.35) });
      const cP = TL.cue('auto', 'planetary') - 0.2, k = eio(prog(t, cP, 0.4));
      if (k < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - k; ctx.translate(-k * 260, 0);
        drawConverter(ctx, W / 2, 850, 0.92, t, COL.ice, COL.auto, '#ff7a59');
        txt(ctx, 'ENGINE SIDE', 384, 1118, { size: 27, weight: 800, ls: 4, color: COL.ice });
        txt(ctx, 'GEARBOX SIDE', 696, 1118, { size: 27, weight: 800, ls: 4, color: COL.auto });
        ctx.restore();
        ctx.save(); ctx.globalAlpha *= 1 - k;
        chipRow(ctx, ['TORQUE CONVERTER', 'FLUID, NOT A CLUTCH'], W / 2, 1214, [COL.auto, '#ff7a59'], [prog(t, TL.cue('auto', 'torque'), 0.25), prog(t, TL.cue('auto', 'fluid') - 0.25, 0.25)], { size: 29 });
        ctx.restore();
      }
      if (k > 0) {
        ctx.save(); ctx.globalAlpha *= k; ctx.translate((1 - k) * 260, 0);
        drawPlanetary(ctx, 500, 850, 226, (t - cP) * 1.9, PCOL);
        [['SUN', PCOL.sun], ['PLANETS', PCOL.planet], ['RING', PCOL.ring]].forEach(([l, c], i) => {
          ctx.beginPath(); ctx.arc(70, 596 + i * 46 + 44, 10, 0, TAU); ctx.fillStyle = c; ctx.fill();
          txt(ctx, l, 92, 606 + i * 46 + 44, { size: 26, weight: 800, ls: 3, align: 'left', color: COL.ice });
        });
        const cSh = TL.cue('auto', 'shift'), gear = 1 + Math.min(3, Math.max(0, Math.floor((t - cSh) / 0.42) + 1)) * (t >= cSh ? 1 : 0);
        const since = t >= cSh ? ((t - cSh) % 0.42) : 1;
        ctx.save(); rrect(ctx, 824, 742, 190, 216, 30); ctx.fillStyle = 'rgba(9,18,46,.85)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = hexA(COL.auto, 0.8); ctx.stroke(); ctx.restore();
        txt(ctx, 'D', 866, 800, { size: 40, weight: 900, color: COL.auto });
        txt(ctx, 'AUTO', 946, 797, { size: 24, weight: 800, ls: 4, color: COL.ice });
        pop(ctx, 919, 890, 0.6 + 0.4 * prog(since, 0, 0.16), () => txt(ctx, String(gear), 919, 930, { size: 120, weight: 900 }));
        ctx.restore();
        ctx.save(); ctx.globalAlpha *= k;
        chipRow(ctx, ['PLANETARY GEARS', 'SHIFTS FOR YOU'], W / 2, 1214, COL.auto, [prog(t, cP + 0.25, 0.25), prog(t, cSh, 0.25)], { size: 30 });
        ctx.restore();
      }
    },

    cvt(ctx, t, TL, g) {
      header(ctx, { eyebrow: '03 / 04', title: 'CVT', sub: 'No fixed gears. Just ratios.', color: COL.cvt, p: prog(t, g.start, 0.35) });
      const c0 = TL.cue('cvt', 'two'), dur = Math.max(1, g.end - c0 - 0.5), om = 2.6;
      const ratio = tt => 0.04 + 0.92 * eio(prog(tt, c0, dur));
      const r1 = tt => lerp(72, 158, ratio(tt)), r2 = tt => lerp(158, 72, ratio(tt)), R = ratio(t);
      const a2 = integ(tt => om * r1(tt) / r2(tt), g.start, t), ph = integ(tt => om * r1(tt), g.start, t);
      pop(ctx, 850, 420, prog(t, TL.cue('cvt', 'no'), 0.25), () => chip(ctx, 'NO GEARS', 850, 420, COL.cvt, { size: 34, solid: true }));
      // explicit pulley angles: the engine pulley turns at constant speed while the wheel pulley speeds up
      const cx = W / 2, cy = 800, d = 430;
      drawCVT(ctx, cx, cy, 1, R, ph, COL.cvt, { a1: om * (t - g.start), a2 });
      txt(ctx, 'ENGINE', cx - d / 2, cy + 222, { size: 27, weight: 800, ls: 4, color: COL.ice });
      txt(ctx, 'WHEELS', cx + d / 2, cy + 222, { size: 27, weight: 800, ls: 4, color: COL.cvt });
      drawGauge(ctx, 300, 1168, 112, 0.62 + 0.012 * Math.sin(t * 9), COL.cvt, { zones: [[0.5, 0.74, COL.cvt]], label: 'ENGINE RPM' });
      pop(ctx, 300, 1296, prog(t, TL.cue('cvt', 'stays'), 0.25), () => chip(ctx, 'STAYS IN THE SWEET SPOT', 300, 1300, COL.cvt, { size: 24 }));
      txt(ctx, String(Math.round(lerp(18, 132, eio(prog(t, c0, dur))))), 760, 1196, { size: 150, weight: 900 });
      txt(ctx, 'KM/H', 760, 1246, { size: 30, weight: 800, ls: 8, color: COL.ice });
      const up = prog(t, c0, 0.3);
      if (up > 0) txt(ctx, 'SPEED CLIMBS', 760, 1056, { size: 26, weight: 800, ls: 4, color: COL.cvt, alpha: up });
    },

    dct(ctx, t, TL, g) {
      header(ctx, { eyebrow: '04 / 04', title: 'DUAL CLUTCH', sub: 'Two clutches. One is always ready.', color: COL.dct, p: prog(t, g.start, 0.35), size: 128 });
      const cS = TL.cue('dct', 'shifts'), T = [0, 0.48, 0.96, 1.44].map(d => cS + d);
      const done = T.filter(x => t >= x), gear = 1 + done.length, last = done.length ? done[done.length - 1] : -9;
      const st = { gear, next: Math.min(7, gear + 1), swap: prog(t, last, 0.13), flow: t * 190, pulse: t };
      drawDCT(ctx, W / 2, 862, 0.95, st, COL.dct);
      const fl = 1 - prog(t, last, 0.3);
      if (fl > 0 && done.length) {
        const rg = ctx.createRadialGradient(W / 2, 862, 0, W / 2, 862, 620);
        rg.addColorStop(0, hexA(COL.dct, 0.3 * fl)); rg.addColorStop(1, hexA(COL.dct, 0));
        ctx.fillStyle = rg; ctx.fillRect(0, 240, W, 1240);
      }
      chipRow(ctx, ['HOLDS YOUR GEAR', 'NEXT GEAR READY'], W / 2, 1206, [COL.dct, COL.ice], [prog(t, TL.cue('dct', 'holds'), 0.25), prog(t, TL.cue('dct', 'next'), 0.25)], { size: 30 });
      pop(ctx, W / 2, 1284, prog(t, cS, 0.25), () => chip(ctx, 'SHIFTS IN MILLISECONDS', W / 2, 1284, COL.dct, { size: 32, solid: true }));
    },

    outro(ctx, t, TL, g) {
      const p = prog(t, g.start, 0.3), sw = eio(prog(t, g.voEnd + 0.35, 0.45));
      pop(ctx, W / 2, 440, p, () => { txt(ctx, 'WHICH ONE', W / 2, 430, { size: 116, weight: 900 }); txt(ctx, 'DO YOU DRIVE?', W / 2, 546, { size: 116, weight: 900, color: COL.gold }); }, 0.85);
      if (sw < 1) { ctx.save(); ctx.globalAlpha *= 1 - sw; tiles(ctx, t, 640, 290, KEYS.map((_, i) => prog(t, g.start + 0.12 + i * 0.08, 0.3))); ctx.restore(); }
      endCard(ctx, sw, 900);
      pop(ctx, W / 2, 1220, prog(t, g.voEnd + 0.75, 0.3), () => chip(ctx, 'COMMENT YOURS  +  FOLLOW FOR MORE', W / 2, 1220, COL.gold, { size: 30 }));
    },
  };

  REELS.v1 = {
    accent: id => ({ hook: COL.blue, manual: COL.manual, auto: COL.auto, cvt: COL.cvt, dct: COL.dct, outro: COL.gold }[id]),
    draw(ctx, t, TL, g) {
      ctx.save(); ctx.globalAlpha = g.i === 0 ? 1 - prog(t, g.end - 0.16, 0.16) : sceneAlpha(t, g);
      scenes[g.id](ctx, t, TL, g);
      ctx.restore();
    },
  };
})();

'use strict';
// V3 — "The one habit that kills it": each transmission's killer habit, then the fix.
(function () {
  const T = {
    manual: { name: 'MANUAL', kill: 'RESTING YOUR FOOT ON THE CLUTCH', fix: "FOOT OFF UNLESS YOU'RE SHIFTING", short: 'Foot off the clutch pedal', kc: ['resting', 0], fc: ['foot', 1] },
    auto: { name: 'AUTOMATIC', kill: 'HEAT + OLD FLUID', fix: 'FRESH FLUID, ON SCHEDULE', short: 'Fresh fluid, on schedule', kc: ['heat', 0], fc: ['change', 0] },
    cvt: { name: 'CVT', kill: 'HARD LAUNCHES + WRONG FLUID', fix: 'EASY LAUNCHES, CVT FLUID ONLY', short: 'Easy launches, CVT fluid only', kc: ['hard', 0], fc: ['ease', 0] },
    dct: { name: 'DUAL CLUTCH', kill: 'CREEPING IN TRAFFIC', fix: 'LEAVE A GAP, THEN GO', short: 'Leave a gap, then go', kc: ['creeping', 0], fc: ['leave', 0] },
  };
  const KEYS = Object.keys(T);

  function verdict(ctx, o, tK, tF, t) {
    const fixed = t >= tF, col = fixed ? COL.good : COL.bad, s = fixed ? o.fix : o.kill, p = prog(t, fixed ? tF : tK, 0.28);
    pop(ctx, W / 2, 1243, p, () => {
      ctx.save(); rrect(ctx, 70, 1172, 940, 142, 34); ctx.fillStyle = hexA(col, 0.13); ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
      chip(ctx, fixed ? 'THE FIX' : 'WHAT KILLS IT', 70 + (fixed ? 96 : 150), 1172, col, { size: 27, solid: true });
      txt(ctx, s, W / 2, 1272, { size: fit(ctx, s, 860, 56, 900), weight: 900 });
    }, 0.86);
  }
  function shoe(ctx, x, y, s) {
    ctx.save(); rrect(ctx, x - 62 * s, y - 120 * s, 124 * s, 240 * s, 58 * s);
    ctx.fillStyle = 'rgba(232,238,255,.92)'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.lineWidth = 5; ctx.strokeStyle = '#8fa0cc'; ctx.stroke();
    ctx.strokeStyle = '#3a4a78'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 30 * s, y - (70 - i * 26) * s); ctx.lineTo(x + 30 * s, y - (70 - i * 26) * s); ctx.stroke(); }
    rrect(ctx, x - 62 * s, y + 62 * s, 124 * s, 58 * s, [8, 8, 58 * s, 58 * s]); ctx.fillStyle = '#8fa0cc'; ctx.fill(); ctx.restore();
  }
  function clutchDisc(ctx, cx, cy, R, ang, heat) {
    const col = mix(COL.manual, COL.bad, heat);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.82, 0, TAU); ctx.lineWidth = R * 0.3; ctx.setLineDash([R * 0.34, R * 0.09]); ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 20 + 50 * heat; ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(0, 0, R * 0.56, 0, TAU); ctx.fillStyle = '#0e1b40'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = COL.ice; ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate(i * TAU / 6); rrect(ctx, R * 0.26, -R * 0.07, R * 0.2, R * 0.14, 8); ctx.fillStyle = hexA(COL.ice, 0.7); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0, 0, R * 0.14, 0, TAU); ctx.fillStyle = COL.ice; ctx.fill();
    ctx.restore();
  }
  function bottle(ctx, x, y, col, label, ok, p) {
    pop(ctx, x, y, p, () => {
      ctx.save(); rrect(ctx, x - 44, y - 44, 88, 104, 16); ctx.fillStyle = hexA(col, 0.22); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke();
      rrect(ctx, x - 16, y - 70, 32, 28, 6); ctx.fillStyle = col; ctx.fill(); ctx.restore();
      txt(ctx, label, x + 70, y + 20, { size: 30, weight: 900, align: 'left', ls: 1 });
      if (ok) check(ctx, x + 26, y + 52, 26, COL.good); else cross(ctx, x + 26, y + 52, 26, COL.bad);
    });
  }
  function plates(ctx, cx, cy, s, closed, col, hot) {
    const gap = lerp(34, 10, closed) * s, c = hot > 0 ? mix(col, COL.bad, hot) : col;
    for (const sg of [-1, 1]) {
      ctx.save(); rrect(ctx, cx + sg * gap - 10 * s, cy - 62 * s, 20 * s, 124 * s, 9 * s);
      ctx.fillStyle = closed > 0.5 || hot > 0.3 ? c : '#0e1b40'; ctx.shadowColor = c; ctx.shadowBlur = 16 + 40 * Math.max(hot, closed > 0.5 ? 0.4 : 0); ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 4; ctx.strokeStyle = c; ctx.stroke(); ctx.restore();
    }
  }

  const art = {
    manual(ctx, t, b, k) {
      const px = 430, restX = 190, y = 880;
      ctx.save(); rrect(ctx, restX - 62, y - 30, 124, 220, 20); ctx.fillStyle = 'rgba(14,27,64,.9)'; ctx.fill(); ctx.lineWidth = 4; ctx.setLineDash([12, 10]); ctx.strokeStyle = hexA(COL.good, 0.4 + 0.6 * k); ctx.stroke(); ctx.restore();
      txt(ctx, 'FOOTREST', restX, y + 232, { size: 25, weight: 800, ls: 3, color: k > 0.5 ? COL.good : COL.ice });
      const press = (0.3 + 0.04 * Math.sin(t * 7)) * b;
      drawPedal(ctx, px, y, 1, press, mix(COL.manual, COL.bad, b), null);
      txt(ctx, 'CLUTCH', px, y + 232, { size: 25, weight: 800, ls: 3, color: COL.ice });
      shoe(ctx, lerp(px + 6 + press * 30, restX, k), lerp(y + 60 + press * 26, y + 80, k) - Math.sin(Math.PI * k) * 70, 0.8);
      clutchDisc(ctx, 790, 850, 178, t * 2.4, b);
      if (b > 0.25) sparks(ctx, 790, 850, t, 22, 210, COL.gold);
      txt(ctx, b > 0.25 ? 'SLIPPING + WEARING' : 'FULLY ENGAGED', 790, 1086, { size: 28, weight: 900, ls: 3, color: b > 0.25 ? COL.bad : COL.good });
      if (k > 0.6) check(ctx, 790, 850, 44, COL.good, prog(k, 0.6, 0.4));
    },
    auto(ctx, t, b, k, TL) {
      const hot = b > 0.4;
      if (hot) { const rg = ctx.createRadialGradient(350, 880, 60, 350, 880, 330); rg.addColorStop(0, hexA(COL.bad, 0.26 + 0.1 * Math.sin(t * 8))); rg.addColorStop(1, hexA(COL.bad, 0)); ctx.fillStyle = rg; ctx.fillRect(0, 560, 720, 640); }
      drawGauge(ctx, 350, 880, 214, lerp(0.42, 0.93, b) + 0.008 * Math.sin(t * 11), hot ? COL.bad : COL.good, { zones: [[0.25, 0.6, COL.good], [0.78, 1, COL.bad]], label: 'TEMP' });
      txt(ctx, hot ? 'OVERHEATING' : 'NORMAL', 350, 1108, { size: 30, weight: 900, ls: 3, color: hot ? COL.bad : COL.good });
      drawDrop(ctx, 800, 900, 96, mix('#ff4b55', '#5a3418', b));
      txt(ctx, hot ? 'OLD FLUID' : 'FRESH FLUID', 800, 1108, { size: 30, weight: 900, ls: 3, color: hot ? '#c58a5a' : '#ff6b74' });
      txt(ctx, 'ATF', 800, 712, { size: 26, weight: 800, ls: 5, color: COL.ice });
      pop(ctx, W / 2, 640, prog(t, TL.cue('auto', 'sooner'), 0.25), () => chip(ctx, 'TOWING? CHANGE IT SOONER', W / 2, 640, COL.gold, { size: 29, solid: true }));
    },
    cvt(ctx, t, b, k, TL, g) {
      const ratio = b > 0.02 ? 0.12 + 0.3 * Math.abs(Math.sin(t * 8.5)) * b + 0.5 * k : 0.12 + 0.76 * (0.5 - 0.5 * Math.cos((t - g.start) * 1.6)) * (0.4 + 0.6 * k);
      drawCVT(ctx, W / 2, 800, 0.9, clamp(ratio), t * (150 + 520 * b), COL.cvt, { belt: mix(COL.cvt, COL.bad, b), c2: mix(COL.cvt, COL.bad, b) });
      if (b > 0.3) { sparks(ctx, W / 2 - 194, 720, t, 16, 150, COL.gold); sparks(ctx, W / 2 + 194, 880, t + 0.4, 12, 130, COL.gold); }
      txt(ctx, b > 0.3 ? 'BELT SLIP' : 'SMOOTH', W / 2, 1006, { size: 28, weight: 900, ls: 4, color: b > 0.3 ? COL.bad : COL.good });
      const cW = TL.cue('cvt', 'wrong'), cO = TL.cue('cvt', 'only');
      bottle(ctx, 190, 1082, '#c58a5a', 'ANY OLD ATF', false, prog(t, cW, 0.25));
      bottle(ctx, 620, 1082, COL.cvt, 'CVT FLUID', true, prog(t, cO, 0.25));
    },
    dct(ctx, t, b, k, TL, g) {
      const s = 1.5, y = 1040, tF = TL.cue('dct', 'leave'), tGo = TL.cue('dct', 'then');
      const creep = Math.floor((t - g.start) / 0.75) * 16 + 16 * eio(prog((t - g.start) % 0.75, 0.1, 0.4));
      const lead = t < tF ? creep : Math.floor((tF - g.start) / 0.75) * 16 + 16 + 300 * eio(prog(t, tF, 1.0));
      const base = t < tF ? creep : Math.floor((tF - g.start) / 0.75) * 16 + 16;
      const me = t < tF ? creep * 0.98 + 3 * Math.sin(t * 5) : base + 262 * eio(prog(t, tGo, 0.7));
      const waiting = t >= tF && t < tGo;
      ctx.save(); ctx.strokeStyle = 'rgba(185,200,242,.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(40, y + 14); ctx.lineTo(W - 40, y + 14); ctx.stroke();
      ctx.setLineDash([40, 34]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(185,200,242,.16)'; ctx.beginPath(); ctx.moveTo(40, y + 58); ctx.lineTo(W - 40, y + 58); ctx.stroke(); ctx.restore();
      drawCar(ctx, 716 + lead, y, s, '#8fa0cc', { fill: '#26345e', spin: lead / 22, glow: 0 });
      drawCar(ctx, 1072 + lead, y, s, '#8fa0cc', { fill: '#26345e', spin: lead / 22, glow: 0 });
      const mx = 362 + me;
      drawCar(ctx, mx, y, s, COL.dct, { spin: me / 22 });
      const slip = t < tF ? b : 0, cx = mx - 158, cy = 760;
      ctx.save(); ctx.strokeStyle = 'rgba(185,200,242,.3)'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(cx, cy + 104); ctx.lineTo(cx, y - 104); ctx.stroke(); ctx.restore();
      plates(ctx, cx, cy, 1.5, t < tF ? 0.45 : waiting ? 0 : 1, t < tF ? COL.dct : COL.good, slip);
      if (slip > 0.3) sparks(ctx, cx, cy, t, 18, 120, COL.gold);
      const lab = t < tF ? (slip > 0.3 ? 'CLUTCH SLIPPING' : 'STOP-AND-GO TRAFFIC') : waiting ? 'WAIT FOR THE GAP' : 'FULLY ENGAGED';
      txt(ctx, lab, Math.max(cx, 250), cy - 122, { size: 32, weight: 900, ls: 3, color: t < tF ? (slip > 0.3 ? COL.bad : COL.ice) : waiting ? COL.gold : COL.good });
    },
  };

  function topic(ctx, t, TL, g) {
    const o = T[g.id], i = KEYS.indexOf(g.id), tK = TL.cue(g.id, ...o.kc), tF = TL.cue(g.id, ...o.fc) - 0.08;
    const k = eio(prog(t, tF, 0.55)), b = eo3(prog(t, tK - 0.1, 0.5)) * (1 - k);
    header(ctx, { eyebrow: `0${i + 1} / 04`, title: o.name, color: COL[g.id], p: prog(t, g.start, 0.35), size: 132 });
    const hp = t < tF ? 1 - 0.8 * eo3(prog(t, tK, Math.max(0.6, tF - tK))) : lerp(0.2, 1, eo3(prog(t, tF, 0.9)));
    healthBar(ctx, 90, 548, 900, 24, hp, 'TRANSMISSION HEALTH');
    art[g.id](ctx, t, b, k, TL, g);
    verdict(ctx, o, tK, tF, t);
  }

  REELS.v3 = {
    accent: id => ({ hook: COL.bad, manual: COL.manual, auto: COL.auto, cvt: COL.cvt, dct: COL.dct, outro: COL.good }[id]),
    draw(ctx, t, TL, g) {
      ctx.save(); ctx.globalAlpha = g.i === 0 ? 1 - prog(t, g.end - 0.16, 0.16) : sceneAlpha(t, g);
      if (g.id === 'hook') {
        const cH = TL.cue('hook', 'has'), cT = TL.cue('hook', 'that'), cK = TL.cue('hook', 'kills');
        pop(ctx, W / 2, 400, 0.6 + 0.4 * prog(t, 0, 0.25), () => txt(ctx, 'EVERY TRANSMISSION', W / 2, 420, { size: 88, weight: 900 }));
        // all three lines are on screen from frame one (works muted); each lights up as it is spoken
        const hp = prog(t, cH - 0.05, 0.22), kp = prog(t, cT - 0.05, 0.22), sh = (1 - prog(t, cK, 0.4)) * (t >= cK ? 10 : 0);
        txt(ctx, 'HAS ONE HABIT', W / 2, 530, { size: lerp(84, 88, eback(hp)), weight: 900, alpha: 0.3 + 0.7 * hp });
        txt(ctx, 'THAT KILLS IT.', W / 2 + Math.sin(t * 70) * sh, 676, { size: lerp(118, 128, eback(kp)), weight: 900, color: COL.bad, glow: kp > 0 ? COL.bad : null, alpha: 0.3 + 0.7 * kp });
        KEYS.forEach((key, i) => {
          const y = 800 + i * 122, p = 0.4 + 0.6 * prog(t, 0.05 + i * 0.08, 0.3), d = eo3(prog(t, cK + i * 0.12, 0.7));
          pop(ctx, W / 2, y, p, () => {
            ctx.save(); rrect(ctx, 70, y - 50, 940, 100, 28); ctx.fillStyle = 'rgba(9,18,46,.82)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = hexA(COL[key], 0.6); ctx.stroke(); ctx.restore();
            txt(ctx, T[key].name, 104, y + 15, { size: 42, weight: 900, align: 'left', color: COL[key] });
            healthBar(ctx, 470, y - 12, 420, 24, 1 - d * (0.72 + 0.06 * i));
            txt(ctx, Math.round((1 - d * (0.72 + 0.06 * i)) * 100) + '%', 984, y + 13, { size: 34, weight: 900, align: 'right', color: d > 0.5 ? COL.bad : COL.good });
          }, 0.85);
        });
      } else if (g.id === 'outro') {
        const cS = TL.cue('outro', 'save');
        header(ctx, { eyebrow: 'THE CHEAT SHEET', title: 'MAKE IT LAST', color: COL.good, p: prog(t, g.start, 0.35), size: 132 });
        KEYS.forEach((key, i) => {
          const y = 642 + i * 136, p = prog(t, g.start + 0.15 + i * 0.22, 0.3);
          pop(ctx, W / 2, y, p, () => {
            ctx.save(); rrect(ctx, 70, y - 58, 940, 116, 30); ctx.fillStyle = 'rgba(9,18,46,.84)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = hexA(COL[key], 0.6); ctx.stroke(); ctx.restore();
            check(ctx, 134, y, 34, COL.good, prog(t, g.start + 0.3 + i * 0.22, 0.35));
            txt(ctx, T[key].name, 196, y - 12, { size: 27, weight: 900, ls: 4, align: 'left', color: COL[key] });
            txt(ctx, T[key].short, 196, y + 34, { size: 42, weight: 800, align: 'left' });
          }, 0.88);
        });
        pop(ctx, W / 2, 1206, prog(t, cS - 0.05, 0.3), () => chip(ctx, 'SAVE THIS FOR YOUR NEXT SERVICE', W / 2, 1206, COL.gold, { size: 34, solid: true }));
        pop(ctx, W / 2, 1292, prog(t, g.voEnd + 0.2, 0.3), () => chip(ctx, '@monacoautopartsinc  ·  follow for more', W / 2, 1292, COL.white, { size: 30 }));
      } else topic(ctx, t, TL, g);
      ctx.restore();
    },
  };
})();

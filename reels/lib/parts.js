'use strict';
// Mechanical illustrations shared by the three reels. All are drawn from primitives
// so they stay crisp at 1080x1920 and can be driven by any time/state value.

// ---- spur gears ----
function gearPath(ctx, r, n, ang) {
  const m = 2 * r / n, ro = r + 0.9 * m, ri = r - 1.1 * m, s = TAU / n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = ang + i * s;
    for (const [aa, rr] of [[a - 0.29 * s, ri], [a - 0.12 * s, ro], [a + 0.12 * s, ro], [a + 0.29 * s, ri]]) ctx.lineTo(rr * Math.cos(aa), rr * Math.sin(aa));
  }
  ctx.closePath();
  return ri;
}
function drawGear(ctx, x, y, r, n, ang, col, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= o.alpha ?? 1;
  const ri = gearPath(ctx, r, n, ang);
  ctx.fillStyle = o.fill || '#0e1b40'; ctx.shadowColor = col; ctx.shadowBlur = o.glow ?? 26; ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = o.lw || 5; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.stroke();
  const rin = ri * 0.74, k = o.spokes ?? (r > 80 ? 5 : 3);
  ctx.globalAlpha *= 0.55; ctx.lineWidth = Math.max(2, (o.lw || 5) * 0.6);
  ctx.beginPath(); ctx.arc(0, 0, rin, 0, TAU); ctx.stroke();
  for (let i = 0; i < k; i++) {
    const a = ang + i * TAU / k;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); ctx.lineTo(Math.cos(a) * rin, Math.sin(a) * rin); ctx.stroke();
  }
  ctx.globalAlpha /= 0.55;
  ctx.beginPath(); ctx.arc(0, 0, Math.max(6, r * 0.2), 0, TAU); ctx.fillStyle = col; ctx.fill();
  ctx.restore();
}
// meshing pair, driver on the left. n1+n2 is constant across ratios so the span never moves.
function drawGearPair(ctx, cx, cy, m, n1, n2, th, sep, c1, c2, o = {}) {
  const r1 = m * n1 / 2, r2 = m * n2 / 2, half = r1 + r2;
  const x1 = cx - half + r1 - sep / 2, x2 = cx + half - r2 + sep / 2;
  const th2 = Math.PI - Math.PI / n2 - th * n1 / n2 + (o.slip || 0);
  drawGear(ctx, x1, cy, r1, n1, th, c1, o);
  drawGear(ctx, x2, cy, r2, n2, th2, c2, o);
  return { x1, x2, r1, r2 };
}
function drawRing(ctx, x, y, R, n, ang, col, band) {
  const m = 2 * R / n, s = TAU / n;
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, R + band, 0, TAU);
  for (let i = 0; i < n; i++) {
    const a = ang + i * s;
    const pts = [[a - 0.29 * s, R + 1.1 * m], [a - 0.12 * s, R - 0.9 * m], [a + 0.12 * s, R - 0.9 * m], [a + 0.29 * s, R + 1.1 * m]];
    pts.forEach(([aa, rr], j) => { const px = rr * Math.cos(aa), py = rr * Math.sin(aa); if (i === 0 && j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
  }
  ctx.closePath();
  ctx.fillStyle = '#0e1b40'; ctx.shadowColor = col; ctx.shadowBlur = 26; ctx.fill('evenodd');
  ctx.shadowBlur = 0; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.stroke();
  ctx.restore();
}
// planetary set with the ring held: sun drives, carrier turns at 1/3 speed
function drawPlanetary(ctx, cx, cy, R, thS, cols, o = {}) {
  const Ns = 24, Np = 12, Nr = 48, rs = R * Ns / Nr, rp = R * Np / Nr, rc = rs + rp, phi = thS * Ns / (Ns + Nr);
  drawRing(ctx, cx, cy, R, Nr, TAU / Nr / 2, cols.ring, R * 0.13);
  ctx.save(); ctx.strokeStyle = hexA(cols.carrier, 0.75); ctx.lineWidth = 12; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) { const a = phi + i * TAU / 4; ctx.lineTo(cx + rc * Math.cos(a), cy + rc * Math.sin(a)); }
  ctx.closePath(); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 4; i++) {
    const a = phi + i * TAU / 4;
    drawGear(ctx, cx + rc * Math.cos(a), cy + rc * Math.sin(a), rp, Np, a * (1 - Nr / Np), cols.planet, { spokes: 3, glow: 14, lw: o.lw || 4 });
  }
  drawGear(ctx, cx, cy, rs, Ns, thS + Math.PI / Ns, cols.sun, { glow: 22, lw: o.lw || 5 });
}

// ---- manual: H-gate shifter + pedal ----
const GATE = { 1: [-1, -1], 2: [-1, 1], 3: [0, -1], 4: [0, 1], 5: [1, -1], 6: [1, 1], 0: [0, 0] };
function gatePos(from, to, p) {
  const a = GATE[from], b = GATE[to];
  const pts = a[0] === b[0] ? [a, b] : [a, [a[0], 0], [b[0], 0], b];
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let d = clamp(p) * lens.reduce((x, y) => x + y, 0);
  for (let i = 0; i < lens.length; i++) { if (d <= lens[i] || i === lens.length - 1) { const k = lens[i] ? clamp(d / lens[i]) : 0; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } d -= lens[i]; }
  return b;
}
function drawShifter(ctx, cx, cy, s, pos, col, active) {
  const dx = 92 * s, dy = 92 * s;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(185,200,242,.28)'; ctx.lineWidth = 30 * s;
  ctx.beginPath();
  for (const gx of [-1, 0, 1]) { ctx.moveTo(cx + gx * dx, cy - dy); ctx.lineTo(cx + gx * dx, cy + dy); }
  ctx.moveTo(cx - dx, cy); ctx.lineTo(cx + dx, cy); ctx.stroke();
  ctx.strokeStyle = '#081230'; ctx.lineWidth = 18 * s; ctx.stroke();
  ctx.restore();
  for (const g of [1, 2, 3, 4, 5, 6]) {
    const [gx, gy] = GATE[g];
    txt(ctx, String(g), cx + gx * dx, cy + gy * (dy + 50 * s) + 13 * s, { size: 36 * s, weight: 800, color: g === active ? col : 'rgba(185,200,242,.55)' });
  }
  const kx = cx + pos[0] * dx, ky = cy + pos[1] * dy;
  ctx.save(); ctx.beginPath(); ctx.arc(kx, ky, 34 * s, 0, TAU);
  const g = ctx.createRadialGradient(kx - 10 * s, ky - 12 * s, 2, kx, ky, 34 * s);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, mix(col, '#000000', 0.45));
  ctx.fillStyle = g; ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.fill(); ctx.restore();
}
function drawPedal(ctx, cx, cy, s, press, col, label) {
  ctx.save(); ctx.translate(cx, cy - 150 * s); ctx.rotate(lerp(0.06, 0.34, press));
  ctx.strokeStyle = 'rgba(185,200,242,.55)'; ctx.lineWidth = 16 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 150 * s); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 13 * s, 0, TAU); ctx.fillStyle = COL.ice; ctx.fill();
  rrect(ctx, -52 * s, 120 * s, 104 * s, 124 * s, 18 * s);
  ctx.fillStyle = '#0e1b40'; ctx.shadowColor = col; ctx.shadowBlur = 14 + 30 * press; ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.stroke();
  ctx.lineWidth = 6 * s; ctx.strokeStyle = hexA(col, 0.75);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-30 * s, (146 + i * 24) * s); ctx.lineTo(30 * s, (146 + i * 24) * s); ctx.stroke(); }
  ctx.restore();
  if (label) txt(ctx, label, cx, cy + 150 * s, { size: 30 * s, weight: 800, ls: 4, color: COL.ice });
}

// ---- automatic: torque converter as two facing fans in fluid ----
function drawFan(ctx, cx, cy, R, ang, col, squash) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(squash, 1);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = '#0e1b40'; ctx.shadowColor = col; ctx.shadowBlur = 26; ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = 6; ctx.strokeStyle = col; ctx.stroke();
  ctx.fillStyle = hexA(col, 0.6);
  for (let i = 0; i < 9; i++) {
    const a = ang + i * TAU / 9;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22);
    ctx.quadraticCurveTo(Math.cos(a + 0.5) * R * 0.7, Math.sin(a + 0.5) * R * 0.7, Math.cos(a + 0.42) * R * 0.93, Math.sin(a + 0.42) * R * 0.93);
    ctx.quadraticCurveTo(Math.cos(a + 0.2) * R * 0.6, Math.sin(a + 0.2) * R * 0.6, Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22);
    ctx.fill();
  }
  ctx.beginPath(); ctx.arc(0, 0, R * 0.2, 0, TAU); ctx.fillStyle = col; ctx.fill();
  ctx.restore();
}
function drawConverter(ctx, cx, cy, s, t, cEng, cBox, cFluid) {
  const R = 190 * s, off = 170 * s, sq = 0.42;
  ctx.save(); rrect(ctx, cx - off - R * sq - 46 * s, cy - R - 40 * s, 2 * (off + R * sq + 46 * s), 2 * (R + 40 * s), 110 * s);
  ctx.fillStyle = hexA(cFluid, 0.09); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = hexA(cFluid, 0.5); ctx.setLineDash([14, 12]); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(185,200,242,.5)'; ctx.lineWidth = 22 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - off - 240 * s, cy); ctx.lineTo(cx - off, cy); ctx.moveTo(cx + off, cy); ctx.lineTo(cx + off + 240 * s, cy); ctx.stroke(); ctx.restore();
  drawFan(ctx, cx - off, cy, R, t * 3.4, cEng, sq);
  // fluid stream thrown from the engine-side fan onto the gearbox-side fan
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const u = (t * 0.55 + rnd(i)) % 1, rad = (0.25 + 0.7 * rnd(i + 99)) * R, ph = rnd(i + 7) * TAU + t * 3 + u * 2.2;
    const x = lerp(cx - off + 30 * s, cx + off - 30 * s, u), y = cy + Math.sin(ph) * rad, z = Math.cos(ph);
    ctx.globalAlpha = Math.sin(u * Math.PI) * (0.5 + 0.5 * z) * 0.95;
    ctx.beginPath(); ctx.arc(x, y, (5 + 4 * z) * s, 0, TAU); ctx.fillStyle = cFluid; ctx.shadowColor = cFluid; ctx.shadowBlur = 12; ctx.fill();
  }
  ctx.restore();
  drawFan(ctx, cx + off, cy, R, t * 3.0 - 0.6, cBox, sq);
}

// ---- CVT: two variable pulleys and a belt ----
function drawCVT(ctx, cx, cy, s, ratio, phase, col, o = {}) {
  const d = 430 * s, r1 = lerp(72, 158, ratio) * s, r2 = lerp(158, 72, ratio) * s;
  const x1 = cx - d / 2, x2 = cx + d / 2, c1 = o.c1 || COL.ice, c2 = o.c2 || col;
  const pulley = (x, r, ang, c) => {
    ctx.save(); ctx.translate(x, cy);
    ctx.beginPath(); ctx.arc(0, 0, 176 * s, 0, TAU); ctx.fillStyle = 'rgba(14,27,64,.9)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = hexA(c, 0.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = hexA(c, 0.16); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = hexA(c, 0.8);
    for (let i = 0; i < 6; i++) { const a = ang + i * TAU / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 26 * s, Math.sin(a) * 26 * s); ctx.lineTo(Math.cos(a) * 170 * s, Math.sin(a) * 170 * s); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, 26 * s, 0, TAU); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 20; ctx.fill();
    ctx.restore();
  };
  pulley(x1, r1, o.a1 ?? phase / r1, c1); pulley(x2, r2, o.a2 ?? phase / r2, c2);
  const phi = Math.acos((r1 - r2) / d);
  const belt = () => {
    ctx.beginPath();
    ctx.moveTo(x1 + r1 * Math.cos(-phi), cy + r1 * Math.sin(-phi));
    ctx.lineTo(x2 + r2 * Math.cos(-phi), cy + r2 * Math.sin(-phi));
    ctx.arc(x2, cy, r2, -phi, phi);
    ctx.lineTo(x1 + r1 * Math.cos(phi), cy + r1 * Math.sin(phi));
    ctx.arc(x1, cy, r1, phi, TAU - phi);
    ctx.closePath();
  };
  ctx.save(); ctx.lineJoin = 'round';
  belt(); ctx.lineWidth = 30 * s; ctx.strokeStyle = o.belt || col; ctx.shadowColor = o.belt || col; ctx.shadowBlur = 26; ctx.stroke();
  ctx.shadowBlur = 0; belt(); ctx.lineWidth = 30 * s; ctx.setLineDash([10 * s, 16 * s]); ctx.lineDashOffset = -phase; ctx.strokeStyle = 'rgba(4,10,28,.55)'; ctx.stroke();
  ctx.restore();
  return { x1, x2, r1, r2 };
}

// ---- dial gauge ----
function drawGauge(ctx, cx, cy, R, val, col, o = {}) {
  const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, a = lerp(a0, a1, clamp(val));
  ctx.save(); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.lineWidth = R * 0.13; ctx.strokeStyle = 'rgba(185,200,242,.2)'; ctx.stroke();
  for (const z of o.zones || []) { ctx.beginPath(); ctx.arc(cx, cy, R, lerp(a0, a1, z[0]), lerp(a0, a1, z[1])); ctx.strokeStyle = z[2]; ctx.shadowColor = z[2]; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0; }
  ctx.strokeStyle = 'rgba(185,200,242,.5)'; ctx.lineWidth = 3;
  for (let i = 0; i <= 10; i++) { const b = lerp(a0, a1, i / 10); ctx.beginPath(); ctx.moveTo(cx + Math.cos(b) * R * 0.76, cy + Math.sin(b) * R * 0.76); ctx.lineTo(cx + Math.cos(b) * R * 0.84, cy + Math.sin(b) * R * 0.84); ctx.stroke(); }
  ctx.strokeStyle = col; ctx.lineWidth = R * 0.07; ctx.shadowColor = col; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * R * 0.12, cy - Math.sin(a) * R * 0.12); ctx.lineTo(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.1, 0, TAU); ctx.fillStyle = col; ctx.fill();
  ctx.restore();
  if (o.label) txt(ctx, o.label, cx, cy + R * 0.62, { size: R * 0.2, weight: 800, ls: 4, color: COL.ice });
}

// ---- DCT: two clutches feeding odd / even shafts ----
function drawDCT(ctx, cx, cy, s, st, col) {
  const odd = [1, 3, 5, 7], even = [2, 4, 6], yO = cy - 130 * s, yE = cy + 130 * s;
  const xE = cx - 420 * s, xK = cx - 235 * s, xG = cx - 70 * s, step = 132 * s, xOut = cx + 440 * s;
  const cO = col, cE = COL.ice;
  const act = st.gear, actOdd = act % 2 === 1;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = (y, on) => {
    ctx.beginPath(); ctx.moveTo(xE + 70 * s, cy); ctx.lineTo(xE + 110 * s, cy); ctx.lineTo(xE + 110 * s, y); ctx.lineTo(xOut - 60 * s, y); ctx.lineTo(xOut - 60 * s, cy); ctx.lineTo(xOut, cy);
    ctx.lineWidth = 12 * s; ctx.strokeStyle = on ? hexA(col, 0.35) : 'rgba(185,200,242,.2)'; ctx.setLineDash([]); ctx.stroke();
    if (on) { ctx.lineWidth = 8 * s; ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.setLineDash([22 * s, 26 * s]); ctx.lineDashOffset = -st.flow; ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]); }
  };
  path(yO, actOdd); path(yE, !actOdd);
  ctx.restore();
  // engine block
  ctx.save(); rrect(ctx, xE - 70 * s, cy - 78 * s, 140 * s, 156 * s, 22 * s); ctx.fillStyle = '#0e1b40'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = COL.ice; ctx.stroke(); ctx.restore();
  txt(ctx, 'ENGINE', xE, cy + 11 * s, { size: 27 * s, weight: 800, ls: 2 });
  // clutches
  const clutch = (y, closed, c, name) => {
    const gap = lerp(34, 9, closed) * s;
    ctx.save();
    for (const sg of [-1, 1]) {
      rrect(ctx, xK + sg * gap - 9 * s, y - 62 * s, 18 * s, 124 * s, 8 * s);
      ctx.fillStyle = closed > 0.5 ? c : '#0e1b40'; ctx.shadowColor = c; ctx.shadowBlur = closed > 0.5 ? 34 : 0; ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 4; ctx.strokeStyle = c; ctx.stroke();
    }
    ctx.restore();
    txt(ctx, name, xK, y + (y < cy ? -84 : 110) * s, { size: 27 * s, weight: 800, ls: 2, color: closed > 0.5 ? COL.white : COL.ice });
  };
  const k = eio(st.swap ?? 1);                       // 0 -> 1 through a hand-off
  clutch(yO, actOdd ? k : 1 - k, cO, 'CLUTCH 1'); clutch(yE, actOdd ? 1 - k : k, cO, 'CLUTCH 2');
  // gear chips
  const gearChip = (g, x, y) => {
    const on = g === act, ready = g === st.next;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 46 * s, 0, TAU);
    ctx.fillStyle = on ? col : '#0e1b40'; ctx.shadowColor = col; ctx.shadowBlur = on ? 44 : ready ? 16 + 14 * Math.sin(st.pulse * 9) : 0; ctx.fill();
    ctx.shadowBlur = 0; ctx.lineWidth = ready ? 6 : 4; ctx.strokeStyle = on || ready ? col : 'rgba(185,200,242,.45)'; if (ready) ctx.setLineDash([12, 9]); ctx.stroke(); ctx.restore();
    txt(ctx, String(g), x, y + 17 * s, { size: 48 * s, weight: 900, color: on ? COL.bg0 : ready ? COL.white : 'rgba(185,200,242,.6)' });
    if (ready) txt(ctx, 'READY', x, y + (y < cy ? -64 : 92) * s, { size: 25 * s, weight: 800, ls: 3, color: col });
  };
  odd.forEach((g, i) => gearChip(g, xG + i * step, yO));
  even.forEach((g, i) => gearChip(g, xG + step / 2 + i * step, yE));
  txt(ctx, 'ODD GEARS', xG + 1.5 * step, yO - 108 * s, { size: 24 * s, weight: 800, ls: 5, color: 'rgba(185,200,242,.5)' });
  txt(ctx, 'EVEN GEARS', xG + 1.5 * step, yE + 134 * s, { size: 24 * s, weight: 800, ls: 5, color: 'rgba(185,200,242,.5)' });
}

// ---- misc ----
function carPath(ctx, x, y, s) {            // side profile, nose to the right, (x, y) = front bottom
  ctx.beginPath();
  const p = [[0, -10], [-2, -26], [-30, -36], [-66, -40], [-92, -62], [-150, -64], [-178, -46], [-206, -40], [-210, -12], [-200, -8]];
  ctx.moveTo(x, y - 8 * s);
  for (const [px, py] of p) ctx.lineTo(x + px * s, y + py * s);
  ctx.lineTo(x - 4 * s, y - 8 * s); ctx.closePath();
}
function drawCar(ctx, x, y, s, col, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  carPath(ctx, x, y, s); ctx.fillStyle = o.fill || col; ctx.shadowColor = col; ctx.shadowBlur = o.glow ?? 18; ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(4,10,28,.7)';
  ctx.beginPath(); ctx.moveTo(x - 70 * s, y - 42 * s); ctx.lineTo(x - 94 * s, y - 57 * s); ctx.lineTo(x - 146 * s, y - 58 * s); ctx.lineTo(x - 166 * s, y - 44 * s); ctx.closePath(); ctx.fill();
  for (const wx of [-42, -168]) {
    ctx.beginPath(); ctx.arc(x + wx * s, y - 8 * s, 19 * s, 0, TAU); ctx.fillStyle = '#060d22'; ctx.fill(); ctx.lineWidth = 4 * s; ctx.strokeStyle = COL.ice; ctx.stroke();
    const a = (o.spin || 0);
    ctx.beginPath(); ctx.moveTo(x + wx * s + Math.cos(a) * 15 * s, y - 8 * s + Math.sin(a) * 15 * s); ctx.lineTo(x + wx * s - Math.cos(a) * 15 * s, y - 8 * s - Math.sin(a) * 15 * s); ctx.lineWidth = 3 * s; ctx.stroke();
  }
  ctx.restore();
}
function drawDrop(ctx, cx, cy, r, col) {
  ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.7);
  ctx.bezierCurveTo(cx + r * 0.5, cy - r * 0.9, cx + r, cy - r * 0.2, cx + r, cy + r * 0.2);
  ctx.arc(cx, cy + r * 0.2, r, 0, Math.PI);
  ctx.bezierCurveTo(cx - r, cy - r * 0.2, cx - r * 0.5, cy - r * 0.9, cx, cy - r * 1.7);
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.fill();
  ctx.shadowBlur = 0; ctx.beginPath(); ctx.ellipse(cx - r * 0.38, cy + r * 0.1, r * 0.16, r * 0.34, 0.5, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
  ctx.restore();
}
function healthBar(ctx, x, y, w, h, v, label) {
  const c = v > 0.6 ? COL.good : v > 0.35 ? COL.gold : COL.bad;
  rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
  ctx.save(); rrect(ctx, x, y, Math.max(h, w * clamp(v)), h, h / 2); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 18; ctx.fill(); ctx.restore();
  if (label) { txt(ctx, label, x, y - 16, { size: 26, weight: 800, ls: 4, align: 'left', color: COL.ice }); txt(ctx, Math.round(clamp(v) * 100) + '%', x + w, y - 14, { size: 30, weight: 900, align: 'right', color: c }); }
}
function sparks(ctx, cx, cy, t, n, spread, col) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const life = (t * (0.9 + rnd(i) * 0.9) + rnd(i + 31)) % 1, a = rnd(i + 5) * TAU, d = life * spread * (0.5 + rnd(i + 11));
    ctx.globalAlpha = (1 - life) * 0.95;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d - life * life * 30, 5 * (1 - life) + 1.5, 0, TAU);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fill();
  }
  ctx.restore();
}

// Renders one reel to a silent H.264 MP4 (1080x1920, 30 fps) by stepping the canvas frame by frame.
//   node tools/render.mjs v1 out/v1_silent.mp4            full render
//   node tools/render.mjs v1 --sheet out/v1_sheet.jpg 12   contact sheet of 12 evenly spaced frames
//   node tools/render.mjs v1 --frames out/f 3.2,7.5        individual frames at given times
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [reel, a2, a3, a4] = process.argv.slice(2);
const timingFile = path.join(root, 'timing.json');
const timing = fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile, 'utf8')) : {};
const FPS = 30;

const browser = await chromium.launch({ args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', e => { console.error('[pageerror]', e.message); process.exitCode = 1; });
await page.addInitScript(t => { window.TIMING = t; window.HEADLESS = true; window.GUIDES = !!t.__guides; }, { ...timing, __guides: process.env.GUIDES === '1' });
await page.goto(pathToFileURL(path.join(root, 'player.html')).href + '?reel=' + reel);
await page.waitForFunction('window.READY === true', null, { timeout: 30000 });
const duration = await page.evaluate('window.DURATION');
const grab = async t => Buffer.from(await page.evaluate(tt => window.frameJPEG(tt), t), 'base64');

if (a2 === '--frames' || a2 === '--sheet') {
  const times = a2 === '--frames' ? a4.split(',').map(Number)
    : Array.from({ length: +a4 || 12 }, (_, i) => duration * (i + 0.5) / (+a4 || 12));
  const dir = a2 === '--frames' ? a3 : a3 + '.tmp';
  fs.mkdirSync(dir, { recursive: true });
  for (const [i, t] of times.entries()) fs.writeFileSync(path.join(dir, `${reel}_${String(i).padStart(2, '0')}.jpg`), await grab(t));
  if (a2 === '--sheet') {
    const cols = 6, rows = Math.ceil(times.length / cols);
    await new Promise(r => spawn('ffmpeg', ['-v', 'error', '-y', '-i', path.join(dir, `${reel}_%02d.jpg`), '-vf', `scale=360:-1,tile=${cols}x${rows}`, '-frames:v', '1', '-q:v', '3', a3], { stdio: 'inherit' }).on('close', r));
    fs.rmSync(dir, { recursive: true });
  }
  console.log(`${reel}: duration ${duration.toFixed(2)}s, wrote ${times.length} frame(s): ${times.map(t => t.toFixed(2)).join(', ')}`);
} else {
  const out = a2 || path.join(root, 'out', `${reel}_silent.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', process.env.X264_PRESET || 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(duration * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await grab(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`${reel}: frame ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`${reel}: wrote ${out} — ${n} frames, ${duration.toFixed(2)}s, in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();

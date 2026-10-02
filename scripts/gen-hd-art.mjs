/**
 * Build-time HD art generator (Node + pngjs).
 * Overwrites public/assets/gen + citizens after unpack so Vercel ships HD, not Tiny Ski.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const OUT_GEN = path.join(root, 'public', 'assets', 'gen');
const OUT_CIT = path.join(root, 'public', 'assets', 'citizens');
fs.mkdirSync(OUT_GEN, { recursive: true });
fs.mkdirSync(OUT_CIT, { recursive: true });

const clamp = (v, a = 0, b = 255) => Math.max(a, Math.min(b, v | 0));
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [
  clamp(lerp(c1[0], c2[0], t)),
  clamp(lerp(c1[1], c2[1], t)),
  clamp(lerp(c1[2], c2[2], t)),
  c1[3] ?? 255,
];

function noise2(x, y, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.12) * 43758.5453;
  return n - Math.floor(n);
}
function fbm(x, y, octaves = 4, seed = 0) {
  let v = 0,
    amp = 0.5,
    freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise2(x * freq, y * freq, seed + i * 17);
    amp *= 0.5;
    freq *= 2;
  }
  return v;
}

function makePng(w, h) {
  const png = new PNG({ width: w, height: h, colorType: 6 });
  png.data.fill(0);
  return png;
}
function setPx(png, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}
function fillRect(png, x0, y0, x1, y1, r, g, b, a = 255) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) setPx(png, x, y, r, g, b, a);
}
function fillCircle(png, cx, cy, rad, r, g, b, a = 255) {
  const r2 = rad * rad;
  for (let y = cy - rad; y <= cy + rad; y++) {
    for (let x = cx - rad; x <= cx + rad; x++) {
      const dx = x - cx,
        dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(png, x, y, r, g, b, a);
    }
  }
}
function fillEllipse(png, cx, cy, rx, ry, r, g, b, a = 255) {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx,
        dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(png, x, y, r, g, b, a);
    }
  }
}
function writePng(png, dest) {
  fs.writeFileSync(dest, PNG.sync.write(png));
}

// --- Snow tiles 64x64 ---
const bases = [
  [210, 225, 240],
  [195, 214, 232],
  [220, 232, 245],
  [185, 205, 225],
  [200, 218, 236],
  [215, 228, 242],
];
for (let idx = 0; idx < 6; idx++) {
  const png = makePng(64, 64);
  const base = bases[idx];
  const ice = [160, 195, 220];
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const n = fbm(x / 18 + idx * 3, y / 18 + idx * 2, 5, idx);
      const n2 = fbm(x / 8, y / 8, 3, idx + 9);
      let c = mix(base, ice, 0.15 + 0.25 * n2);
      const edge = Math.min(x, y, 63 - x, 63 - y) / 8;
      let shade = 0.88 + 0.12 * Math.min(1, edge) + (n - 0.5) * 0.18;
      if (noise2(x * 0.7, y * 0.7, idx + 3) > 0.92) shade *= 1.12;
      setPx(png, x, y, clamp(c[0] * shade), clamp(c[1] * shade), clamp(c[2] * shade), 255);
    }
  }
  writePng(png, path.join(OUT_GEN, `tile_snow_${idx}.png`));
}

// heat + ice
{
  const heat = makePng(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const a = clamp(55 + 40 * fbm(x / 20, y / 20, 3, 1));
      setPx(heat, x, y, 255, 120, 40, a);
    }
  writePng(heat, path.join(OUT_GEN, 'tile_heat.png'));
  const ice = makePng(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const n = fbm(x / 12, y / 12, 4, 7);
      const c = mix([120, 170, 200], [200, 230, 245], n);
      setPx(ice, x, y, c[0], c[1], c[2], 180);
    }
  writePng(ice, path.join(OUT_GEN, 'tile_ice.png'));
}

function drawBuilding(kind) {
  let W = 192,
    H = 192;
  if (kind === 'generator') {
    W = 256;
    H = 288;
  }
  const png = makePng(W, H);
  fillEllipse(png, W / 2, H - 30, 55, 16, 20, 30, 45, 90);

  if (kind === 'generator') {
    fillEllipse(png, 128, 225, 80, 25, 45, 55, 70, 255);
    fillEllipse(png, 128, 225, 66, 17, 30, 38, 50, 255);
    fillRect(png, 98, 70, 158, 210, 55, 62, 78, 255);
    for (const by of [95, 130, 165]) {
      fillRect(png, 88, by, 168, by + 8, 70, 78, 95, 255);
      for (const bx of [95, 115, 135, 155]) fillCircle(png, bx, by + 4, 2, 180, 190, 205, 255);
    }
    fillRect(png, 112, 110, 144, 150, 255, 140, 40, 255);
    fillCircle(png, 128, 130, 28, 255, 100, 30, 55);
    fillRect(png, 118, 28, 138, 72, 40, 45, 55, 255);
    fillCircle(png, 128, 55, 8, 255, 180, 60, 200);
    fillCircle(png, 128, 18, 14, 180, 190, 200, 90);
    return png;
  }

  const metal = [62, 72, 88];
  const metal2 = [48, 56, 70];
  const brass = [180, 140, 70];
  const wood = [110, 78, 48];

  if (kind === 'tent') {
    for (let y = 48; y < 150; y++) {
      const t = (y - 48) / 102;
      const half = 10 + t * 66;
      for (let x = 96 - half; x < 96 + half; x++) {
        const shade = x < 96 ? 1 : 0.82;
        setPx(png, x, y, clamp(150 * shade), clamp(120 * shade), clamp(85 * shade), 255);
      }
    }
    fillRect(png, 78, 100, 114, 150, 35, 28, 22, 255);
  } else if (kind === 'gathering') {
    fillRect(png, 40, 90, 152, 160, ...wood, 255);
    fillRect(png, 48, 70, 144, 95, ...metal2, 255);
    fillEllipse(png, 72, 140, 18, 12, 55, 45, 35, 255);
    fillEllipse(png, 118, 138, 22, 14, 40, 40, 45, 255);
  } else if (kind === 'cookhouse') {
    fillRect(png, 45, 85, 150, 158, 90, 70, 55, 255);
    for (let y = 45; y < 85; y++) {
      const t = (y - 45) / 40;
      const half = 8 + t * 52;
      fillRect(png, 97 - half, y, 97 + half, y + 1, 70, 55, 40, 255);
    }
    fillRect(png, 85, 110, 110, 145, 30, 22, 18, 255);
    fillEllipse(png, 105, 110, 13, 10, 255, 120, 40, 255);
  } else if (kind === 'coal') {
    fillEllipse(png, 96, 138, 55, 28, 28, 28, 32, 255);
    fillEllipse(png, 96, 120, 42, 24, 40, 40, 48, 255);
  } else if (kind === 'thumper') {
    fillRect(png, 70, 70, 122, 155, ...metal, 255);
    fillRect(png, 55, 150, 137, 168, ...metal2, 255);
    fillEllipse(png, 96, 42, 18, 14, ...brass, 255);
  } else if (kind === 'workshop') {
    fillRect(png, 42, 80, 155, 160, ...metal2, 255);
    fillRect(png, 42, 70, 155, 88, ...metal, 255);
    fillRect(png, 60, 100, 90, 130, 40, 140, 180, 180);
    fillRect(png, 105, 100, 135, 130, 40, 140, 180, 180);
  } else if (kind === 'medical') {
    fillRect(png, 45, 85, 150, 158, 200, 210, 220, 255);
    fillRect(png, 45, 75, 150, 92, 160, 50, 50, 255);
    fillRect(png, 90, 55, 106, 85, 200, 40, 40, 255);
    fillRect(png, 80, 62, 116, 78, 200, 40, 40, 255);
  } else if (kind === 'tree') {
    fillRect(png, 92, 110, 104, 155, 70, 50, 35, 255);
    fillCircle(png, 96, 70, 38, 140, 170, 150, 230);
    fillCircle(png, 80, 90, 28, 120, 155, 135, 230);
    fillEllipse(png, 96, 55, 25, 14, 235, 242, 250, 200);
  } else if (kind === 'snow') {
    fillEllipse(png, 96, 130, 48, 30, 230, 238, 248, 255);
    fillEllipse(png, 96, 105, 30, 20, 245, 250, 255, 255);
  } else {
    fillRect(png, 50, 80, 140, 155, ...metal, 255);
  }
  return png;
}

for (const [k, name] of [
  ['generator', 'b_generator'],
  ['tent', 'b_tent'],
  ['gathering', 'b_gathering'],
  ['cookhouse', 'b_cookhouse'],
  ['coal', 'b_coal'],
  ['thumper', 'b_thumper'],
  ['workshop', 'b_workshop'],
  ['medical', 'b_medical'],
  ['tree', 'b_tree'],
  ['snow', 'b_snow'],
]) {
  writePng(drawBuilding(k), path.join(OUT_GEN, `${name}.png`));
}

{
  const flake = makePng(24, 24);
  fillCircle(flake, 12, 12, 6, 255, 255, 255, 220);
  writePng(flake, path.join(OUT_GEN, 'snowflake.png'));
  const ember = makePng(16, 16);
  fillCircle(ember, 8, 8, 6, 255, 160, 40, 230);
  fillCircle(ember, 8, 8, 3, 255, 230, 120, 255);
  writePng(ember, path.join(OUT_GEN, 'ember.png'));
  for (const [name, col] of [
    ['state_work', [255, 200, 80]],
    ['state_eat', [255, 140, 80]],
    ['state_sleep', [140, 180, 255]],
    ['state_freeze', [160, 220, 255]],
  ]) {
    const ic = makePng(32, 32);
    fillCircle(ic, 16, 16, 14, col[0], col[1], col[2], 220);
    fillCircle(ic, 16, 16, 6, 20, 30, 45, 200);
    writePng(ic, path.join(OUT_GEN, `${name}.png`));
  }
  const panel = makePng(128, 128);
  fillRect(panel, 4, 4, 124, 124, 18, 32, 48, 230);
  writePng(panel, path.join(OUT_GEN, 'ui_panel.png'));
  for (const [hot, name] of [
    [false, 'ui_btn'],
    [true, 'ui_btn_hot'],
  ]) {
    const btn = makePng(192, 64);
    const fill = hot ? [180, 120, 40, 240] : [40, 60, 85, 240];
    fillRect(btn, 4, 4, 188, 60, fill[0], fill[1], fill[2], fill[3]);
    writePng(btn, path.join(OUT_GEN, `${name}.png`));
  }
}

const FW = 64,
  FH = 80;
const PALETTES = [
  { coat: [70, 90, 130], pants: [40, 45, 60], skin: [220, 185, 155], hat: [50, 55, 70], scarf: [160, 60, 50] },
  { coat: [90, 70, 55], pants: [45, 40, 38], skin: [235, 200, 170], hat: [60, 50, 40], scarf: [40, 90, 120] },
  { coat: [55, 75, 70], pants: [35, 40, 45], skin: [200, 160, 130], hat: [40, 50, 55], scarf: [180, 140, 60] },
  { coat: [100, 55, 70], pants: [50, 40, 55], skin: [240, 210, 185], hat: [70, 40, 50], scarf: [60, 100, 80] },
];

function drawCitizen(pal, facing, frame) {
  const png = makePng(FW, FH);
  const cx = 32;
  const bob = Math.sin((frame * Math.PI) / 2) * 2;
  fillEllipse(png, cx, FH - 8, 14, 4, 15, 20, 30, 80);
  const ly = 52 + bob;
  fillRect(png, cx - 10, ly, cx - 2, ly + 18, ...pal.pants, 255);
  fillRect(png, cx + 2, ly, cx + 10, ly + 18, ...pal.pants, 255);
  const by = 28 + bob;
  fillRect(png, cx - 14, by, cx + 14, by + 28, ...pal.coat, 255);
  fillRect(png, cx - 12, by + 2, cx + 12, by + 8, ...pal.scarf, 255);
  const hy = 12 + bob;
  fillCircle(png, cx, hy + 11, 11, ...pal.skin, 255);
  fillEllipse(png, cx, hy + 4, 13, 8, ...pal.hat, 255);
  if (facing === 0) {
    fillCircle(png, cx - 4, hy + 11, 1, 40, 40, 50, 255);
    fillCircle(png, cx + 4, hy + 11, 1, 40, 40, 50, 255);
  }
  return png;
}

for (let vi = 0; vi < 4; vi++) {
  const sheet = makePng(FW * 4, FH * 4);
  for (let facing = 0; facing < 4; facing++) {
    for (let frame = 0; frame < 4; frame++) {
      const fr = drawCitizen(PALETTES[vi], facing, frame);
      for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
          const si = (fr.width * y + x) << 2;
          const dx = frame * FW + x;
          const dy = facing * FH + y;
          const di = (sheet.width * dy + dx) << 2;
          sheet.data[di] = fr.data[si];
          sheet.data[di + 1] = fr.data[si + 1];
          sheet.data[di + 2] = fr.data[si + 2];
          sheet.data[di + 3] = fr.data[si + 3];
        }
      }
    }
  }
  writePng(sheet, path.join(OUT_CIT, `walk_${vi}.png`));
}

fs.writeFileSync(path.join(OUT_GEN, 'meta.json'), JSON.stringify({ tile: 64, citizenFrame: [64, 80], style: 'hd-painted-2d' }));
console.log('HD art generated into public/assets/gen + citizens');

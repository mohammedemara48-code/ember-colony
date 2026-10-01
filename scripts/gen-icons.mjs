import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crc = Buffer.alloc(4);
  const both = Buffer.concat([typeB, data]);
  crc.writeUInt32BE(crc32(both));
  return Buffer.concat([len, both, crc]);
}
function pngRGB(size, paint) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = paint(x, y, size);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
function paint(x, y, size) {
  const cx = size / 2, cy = size / 2;
  const d = Math.hypot(x - cx, y - cy) / (size / 2);
  let r = 11, g = 26, b = 42;
  if (d < 0.85) { r = 26; g = 51; b = 80; }
  const gd = Math.hypot(x - cx, y - cy * 1.05) / (size * 0.22);
  if (gd < 1) {
    const t = 1 - gd;
    r = Math.min(255, r + 180 * t);
    g = Math.min(255, g + 80 * t);
    b = Math.min(255, b + 20 * t);
  }
  if ((x * 13 + y * 7) % 47 === 0 && d < 0.9) r = g = b = 220;
  return [r | 0, g | 0, b | 0];
}
const dir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon-192.png'), pngRGB(192, paint));
fs.writeFileSync(path.join(dir, 'icon-512.png'), pngRGB(512, paint));
console.log('PWA icons generated');

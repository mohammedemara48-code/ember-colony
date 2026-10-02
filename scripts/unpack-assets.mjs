import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outRoot = path.join(root, 'public', 'assets');
const manifestPath = path.join(__dirname, 'asset-manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.log('No asset-manifest.json — skipping unpack (assets may already exist).');
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let n = 0;
for (const chunk of manifest.chunks) {
  const pack = JSON.parse(fs.readFileSync(path.join(__dirname, chunk), 'utf8'));
  for (const [rel, b64] of Object.entries(pack)) {
    const dest = path.join(outRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
    n++;
  }
}
console.log(`Unpacked ${n} assets into public/assets`);

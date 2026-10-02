import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const chunks = fs.readdirSync(__dirname).filter((f) => f.startsWith('src-bundle-') && f.endsWith('.b64')).sort();
if (!chunks.length) {
  console.log('No src-bundle — skip restore');
  process.exit(0);
}
const b64 = chunks.map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('');
const tgz = Buffer.from(b64, 'base64');
const out = path.join(root, '.src-bundle.tgz');
fs.writeFileSync(out, tgz);
execSync(`tar -xzf .src-bundle.tgz`, { cwd: root, stdio: 'inherit' });
fs.unlinkSync(out);
console.log('Restored source bundle from', chunks.length, 'chunks');

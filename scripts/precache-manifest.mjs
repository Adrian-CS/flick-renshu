// Post-build: list every file of the static export for the service worker,
// and stamp out/sw.js with a version derived from the file contents.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'out');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const hash = createHash('sha256');
const files = [];
for (const p of walk(OUT).sort()) {
  const rel = '/' + relative(OUT, p).split(sep).join('/');
  // _headers is hosting config (Cloudflare Pages), not served as a file
  if (rel === '/sw.js' || rel === '/precache-manifest.json' || rel === '/_headers') continue;
  hash.update(rel).update(readFileSync(p));
  // pages: cache the directory URL ("/practice/") rather than index.html
  files.push(rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel);
}
const version = hash.digest('hex').slice(0, 12);
writeFileSync(join(OUT, 'precache-manifest.json'), JSON.stringify({ version, files }));
const swPath = join(OUT, 'sw.js');
writeFileSync(swPath, readFileSync(swPath, 'utf8').replaceAll('__BUILD_VERSION__', version));
console.log(`✓ precache: ${files.length} ficheros, versión ${version}`);

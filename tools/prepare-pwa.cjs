
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.VITE_BASE_PATH || '/';
if (!/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(base)) throw new Error('VITE_BASE_PATH must be an absolute directory path ending with /');
const dist = path.resolve('dist');
const manifestPath = path.join(dist, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.id = base;
manifest.scope = base;
manifest.start_url = base + '?source=installed';
manifest.icons = manifest.icons.map(icon => ({ ...icon, src: base + icon.src.replace(/^\//, '') }));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
for (const name of ['index.html', 'offline.html']) {
  const filename = path.join(dist, name);
  let html = fs.readFileSync(filename, 'utf8');
  html = html.replaceAll('href="/manifest.json"', 'href="' + base + 'manifest.json"')
    .replaceAll('href="/resources/', 'href="' + base + 'resources/')
    .replaceAll('src="/resources/', 'src="' + base + 'resources/');
  if (name === 'offline.html') html = html.replace('href="/"', 'href="' + base + '"');
  fs.writeFileSync(filename, html);
}
console.log('PWA paths prepared for ' + base);

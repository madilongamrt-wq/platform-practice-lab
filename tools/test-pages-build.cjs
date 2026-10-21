
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='/platform-practice-lab/';
const manifest=JSON.parse(fs.readFileSync('dist/manifest.json','utf8'));
assert.equal(manifest.scope,base);
assert.equal(manifest.id,base);
assert.equal(manifest.start_url,base+'?source=installed');
assert.ok(manifest.icons.every(icon=>icon.src.startsWith(base+'resources/')));
const html=fs.readFileSync('dist/index.html','utf8');
assert.ok(html.includes('href="'+base+'manifest.json"'));
assert.ok(html.includes(base+'assets/'));
const offline=fs.readFileSync('dist/offline.html','utf8');
assert.ok(offline.includes('href="'+base+'"'));
assert.ok(offline.includes('src="'+base+'resources/'));
assert.ok(!html.includes('@appdeploy/client'));
assert.ok(!html.includes('src="/src/'));
console.log('PASS: built application and PWA assets use the GitHub Pages repository path.');

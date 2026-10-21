
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.json'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.id, '/');
  assert.equal(new URL(manifest.start_url, 'https://lab.test').pathname, '/');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === size + 'x' + size);
    assert.ok(icon);
    const png = fs.readFileSync(path.join(root, 'public', icon.src));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /rel="manifest" href="\/manifest.json"/);
  assert.match(html, /rel="apple-touch-icon" href="\/resources\/lab-icon-180.png"/);
  const handlers = {};
  const cachedPaths = [];
  const deleted = [];
  const cachedOffline = { status: 200, offline: true };
  const context = {
    URL, Response,
    self: {
      location: { origin: 'https://lab.test' },
      registration: { scope: 'https://lab.test/' },
      clients: { claim: async () => {} },
      skipWaiting: () => {},
      addEventListener: (type, listener) => { handlers[type] = listener; }
    },
    caches: {
      open: async () => ({ addAll: async paths => cachedPaths.push(...paths) }),
      keys: async () => ['platform-lab-public-old', 'unrelated-cache'],
      delete: async key => { deleted.push(key); },
      match: async input => input === '/offline.html' ? cachedOffline : undefined
    },
    fetch: async () => { throw new Error('offline'); }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8'), context);
  let wait;
  handlers.install({ waitUntil: promise => { wait = promise; } });
  await wait;
  assert.ok(cachedPaths.includes('/offline.html'));
  assert.ok(cachedPaths.every(p => p === '/offline.html' || p === '/manifest.json' || p.startsWith('/resources/lab-icon-')));
  handlers.activate({ waitUntil: promise => { wait = promise; } });
  await wait;
  assert.deepEqual(deleted, ['platform-lab-public-old']);

  for (const [url, method, authorized] of [
    ['https://lab.test/api/progress', 'GET', false],
    ['https://lab.test/__appdeploy/token', 'GET', false],
    ['https://identity.test/login', 'GET', false],
    ['https://lab.test/api/progress/crashloop', 'POST', false],
    ['https://lab.test/private', 'GET', true]
  ]) {
    let intercepted = false;
    handlers.fetch({
      request: { url, method, mode: 'cors', headers: new Headers(authorized ? { Authorization: 'Bearer test' } : {}) },
      respondWith: () => { intercepted = true; }
    });
    assert.equal(intercepted, false, url + ' must bypass offline cache');
  }
  let response;
  handlers.fetch({
    request: { url: 'https://lab.test/', method: 'GET', mode: 'navigate', headers: new Headers() },
    respondWith: promise => { response = promise; }
  });
  assert.equal(await response, cachedOffline);
  const online = { status: 200, online: true };
  context.fetch = async () => online;
  handlers.fetch({
    request: { url: 'https://lab.test/', method: 'GET', mode: 'navigate', headers: new Headers() },
    respondWith: promise => { response = promise; }
  });
  assert.equal(await response, online);

  const browserEvents = {};
  const registrations = [];
  const browser = {
    Event,
    window: {
      isSecureContext: true,
      addEventListener: (type, listener) => { browserEvents[type] = listener; },
      dispatchEvent: event => { browserEvents[event.type]?.(event); }
    },
    navigator: { serviceWorker: { register: async (...args) => { registrations.push(args); } } },
    document: { readyState: 'complete' }
  };
  vm.createContext(browser);
  vm.runInContext(
    stripTypeScriptTypes(fs.readFileSync(path.join(root, 'src/pwa.ts'), 'utf8'), { mode: 'strip' })
      .replace(/^export /gm, '') +
      '\nthis.api = {hasInstallPrompt, requestInstall, registerServiceWorker};',
    browser
  );
  assert.equal(browser.api.hasInstallPrompt(), false);
  let prevented = false;
  let prompted = false;
  browserEvents.beforeinstallprompt({
    preventDefault: () => { prevented = true; },
    prompt: async () => { prompted = true; },
    userChoice: Promise.resolve({ outcome: 'dismissed' })
  });
  assert.equal(prevented, true);
  assert.equal(browser.api.hasInstallPrompt(), true);
  assert.equal(await browser.api.requestInstall(), 'dismissed');
  assert.equal(prompted, true);
  assert.equal(browser.api.hasInstallPrompt(), false);
  assert.equal(await browser.api.requestInstall(), 'unavailable');
  browser.api.registerServiceWorker();
  await Promise.resolve();
  assert.equal(registrations[0][0], '/sw.js');
  assert.equal(registrations[0][1].scope, '/');
  console.log('PASS: PWA manifest, icon dimensions, install prompt, service-worker registration, offline fallback and private-request bypass.');
  console.log('Actual Android/iPhone home-screen installation must be completed on the device.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
